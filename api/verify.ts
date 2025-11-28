import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http, parseAbi, decodeFunctionData } from 'viem';

// Manual chain definition
const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
} as const;

const ABI = parseAbi([
  'function certify(string calldata _hash) external',
  'function verify(string calldata _hash) external view returns (bool, uint256, address)'
]);

const RPC_URL = 'https://rpc-amoy.polygon.technology';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

  if (!CONTRACT_ADDRESS) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Get hash from query parameter
  const { hash } = req.query;

  if (!hash || typeof hash !== 'string') {
    return res.status(400).json({ error: 'Missing hash parameter' });
  }

  console.log(`[Verify] Lookup: ${hash}`);

  try {
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    let fileHashToVerify = hash;
    let isTxLookup = false;

    // Detect if this is a transaction ID
    if (hash.startsWith('0x') && hash.length === 66) {
      isTxLookup = true;
      console.log('   ↳ Detected Transaction ID. Fetching details...');

      try {
        const tx = await publicClient.getTransaction({ hash: hash as `0x${string}` });

        if (tx) {
          console.log('   ↳ TX Found. Decoding input data...');

          try {
            const { args } = decodeFunctionData({
              abi: ABI,
              data: tx.input
            });
            if (args && args[0]) {
              fileHashToVerify = args[0] as string;
              console.log(`   ✅ Decoded File Hash: ${fileHashToVerify}`);
            }
          } catch (decodeErr) {
            console.log('   ⚠️ Standard decode failed. Trying manual extract...');
            const rawInput = tx.input;
            const matches = rawInput.match(/[a-f0-9]{64}/g);
            if (matches) {
              const possibleHash = matches[matches.length - 1];
              if (possibleHash.length === 64) {
                fileHashToVerify = possibleHash;
                console.log(`   ✅ Extracted File Hash: ${fileHashToVerify}`);
              }
            }
          }
        } else {
          console.log('   ❌ TX Not found on chain');
        }
      } catch (txErr: any) {
        console.error('   ❌ Error fetching TX:', txErr.message);
      }
    }

    // Verify the file hash on contract
    console.log(`   ↳ Checking Contract for File Hash: ${fileHashToVerify}`);

    const [exists, timestamp, sender] = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: 'verify',
      args: [fileHashToVerify]
    });

    if (!exists) {
      console.log('   ❌ Contract says: RECORD NOT FOUND');
      return res.status(404).json({ found: false });
    }

    console.log(`   ✅ FOUND! Timestamp: ${timestamp}`);

    return res.status(200).json({
      hash: fileHashToVerify,
      timestamp: Number(timestamp) * 1000,
      sender,
      blockHeight: 0,
      fileName: isTxLookup ? 'Recovered via Ledger Ref' : 'On-Chain Record',
      provenanceType: 'UPLOAD'
    });

  } catch (error: any) {
    console.error('   🚨 SYSTEM ERROR:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
