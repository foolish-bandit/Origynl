import { ChainRecord } from '../types';
import { createPublicClient, http, parseAbi } from 'viem';
import { polygon } from 'viem/chains';

/**
 * BLOCKCHAIN SERVICE ADAPTER - Polygon Mainnet
 *
 * Architecture:
 * 1. Hybrid Verification: Frontend checks Polygon RPC directly (read-only) for file hashes.
 * 2. Transaction Lookup: For TX hashes, we call /api/verify to decode the embedded file hash.
 * 3. Vercel Serverless: /api/certify handles chain writes via serverless functions.
 * 4. Production blockchain - low cost (~$0.01/tx), 2 second confirmation.
 *
 * IMPORTANT: Contract must be deployed to Polygon Mainnet at this address.
 * To deploy: Use Remix, Hardhat, or Foundry with mainnet RPC.
 * Update CONTRACT_ADDRESS below with the deployed contract address.
 */

// TODO: Replace with actual mainnet contract address after deployment
const CONTRACT_ADDRESS = '0x894C98bf09B4e9e4FEd3612803920b7d82C59d41';

// Polygon Mainnet RPC
const publicClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-rpc.com')
});

const ABI = parseAbi([
  'function verify(string calldata _hash) external view returns (bool, uint256, address)'
]);

// Check if a string looks like a transaction hash (0x + 64 hex chars)
const isTransactionHash = (hash: string): boolean => {
  return hash.startsWith('0x') && hash.length === 66;
};

export const findRecordByHash = async (hash: string): Promise<ChainRecord | null> => {
  try {
    // If it looks like a transaction hash, use the API to decode it
    if (isTransactionHash(hash)) {
      console.log('Detected transaction hash, using API to decode...');
      const response = await fetch(`/api/verify?hash=${encodeURIComponent(hash)}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          hash: data.hash,
          timestamp: data.timestamp,
          blockHeight: data.blockHeight || 0,
          sender: data.sender,
          fileName: data.fileName || 'On-Chain Asset',
          provenanceType: data.provenanceType || 'UPLOAD',
          txHash: hash,
          isSimulation: false
        };
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error('API lookup failed');
      }
    }

    // Otherwise, do a direct blockchain read for file hashes
    const [exists, timestamp, sender] = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'verify',
      args: [hash]
    });

    if (exists) {
      return {
        hash: hash,
        timestamp: Number(timestamp) * 1000,
        blockHeight: 0,
        sender: sender,
        fileName: 'On-Chain Asset',
        provenanceType: 'UPLOAD',
        isSimulation: false
      };
    }

    return null;

  } catch (e) {
    console.warn("Chain lookup failed:", e);
    return null;
  }
};

export const writeHashToChain = async (
  hash: string, 
  fileName: string, 
  provenanceType: 'UPLOAD' | 'LIVE_CAPTURE' = 'UPLOAD',
  geoTag?: string
): Promise<ChainRecord> => {
  // Use relative URL - works on same Vercel deployment
  const response = await fetch('/api/certify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, fileName }) 
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Transaction failed (${response.status})`);
  }
  
  const result = await response.json();
  
  return {
    hash,
    fileName,
    timestamp: result.timestamp,
    blockHeight: result.blockHeight,
    sender: result.sender,
    provenanceType, 
    geoTag,
    txHash: result.txHash,
    isSimulation: false
  };
};
