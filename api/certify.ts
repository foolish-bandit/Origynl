import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Polygon Mainnet chain definition
const polygonMainnet = {
  id: 137,
  name: 'Polygon',
  network: 'polygon',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://polygon-rpc.com'] },
    public: { http: ['https://polygon-rpc.com'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
  },
  testnet: false,
} as const;

const ABI = parseAbi([
  'function certify(string calldata _hash) external',
  'function verify(string calldata _hash) external view returns (bool, uint256, address)'
]);

const RPC_URL = 'https://polygon-rpc.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment
  let PRIVATE_KEY = process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error('Missing PRIVATE_KEY or CONTRACT_ADDRESS');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Sanitize private key
  PRIVATE_KEY = PRIVATE_KEY.trim().replace(/^["']|["']$/g, '');
  if (!PRIVATE_KEY.startsWith('0x')) PRIVATE_KEY = `0x${PRIVATE_KEY}`;

  if (PRIVATE_KEY.length !== 66) {
    console.error(`Private key length error: ${PRIVATE_KEY.length}`);
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const { hash } = req.body;
    
    if (!hash || typeof hash !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid hash' });
    }

    console.log(`[Certify] Hash: ${hash.substring(0, 15)}...`);

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

    const publicClient = createPublicClient({
      chain: polygonMainnet,
      transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: polygonMainnet,
      transport: http(RPC_URL)
    });

    // Check if already certified
    const [exists] = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: 'verify',
      args: [hash]
    });

    if (exists) {
      console.log('[Skipped] Already on chain.');
      return res.status(409).json({ error: 'Document already certified.' });
    }

    // Simulate then write
    console.log('[Mining] Sending transaction...');
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: 'certify',
      args: [hash],
      account,
      chain: polygonMainnet,
    });

    const txHash = await walletClient.writeContract(request as any);
    console.log(`[Pending] TX: ${txHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[Success] Block: ${receipt.blockNumber}`);

    return res.status(200).json({
      success: true,
      txHash: receipt.transactionHash,
      blockHeight: Number(receipt.blockNumber),
      timestamp: Date.now(),
      sender: account.address
    });

  } catch (error: any) {
    console.error('[Error]', error.message);
    return res.status(500).json({ error: error.message || 'Transaction failed' });
  }
}
