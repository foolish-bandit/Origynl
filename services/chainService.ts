import { ChainRecord } from '../types';
import { createPublicClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';

/**
 * BLOCKCHAIN SERVICE ADAPTER
 * 
 * Architecture:
 * 1. Hybrid Verification: Frontend checks Polygon RPC directly (read-only).
 * 2. Vercel Serverless: /api/certify handles chain writes via serverless functions.
 * 3. No demo mode - production only.
 */

const CONTRACT_ADDRESS = '0x894C98bf09B4e9e4FEd3612803920b7d82C59d41';

// Direct RPC for Frontend Verification
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology')
});

const ABI = parseAbi([
  'function verify(string calldata _hash) external view returns (bool, uint256, address)'
]);

export const findRecordByHash = async (hash: string): Promise<ChainRecord | null> => {
  try {
    // Direct blockchain read
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
