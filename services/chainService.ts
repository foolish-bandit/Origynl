import { ChainRecord } from '../types';
import { createPublicClient, http, parseAbi, fallback } from 'viem';
import { polygonAmoy } from 'viem/chains';

/**
 * BLOCKCHAIN SERVICE ADAPTER
 *
 * - Frontend reads the Polygon RPC directly for file-hash lookups.
 * - For transaction-ID lookups we proxy through /api/verify to decode the calldata.
 * - Writes go through /api/certify (server signs with the sponsor key).
 * - Reads use a fallback transport so a single RPC hiccup doesn't surface as "not found".
 */

export const CONTRACT_ADDRESS = '0x894C98bf09B4e9e4FEd3612803920b7d82C59d41';

const RPC_ENDPOINTS = [
  import.meta.env?.VITE_AMOY_RPC_URL,
  import.meta.env?.VITE_ALCHEMY_AMOY_URL,
  'https://rpc-amoy.polygon.technology',
].filter((u): u is string => typeof u === 'string' && u.length > 0);

const transports = RPC_ENDPOINTS.map((url) =>
  http(url, { timeout: 15_000, retryCount: 2, retryDelay: 500 })
);

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: transports.length > 1 ? fallback(transports) : transports[0],
});

const ABI = parseAbi([
  'function verify(string calldata _hash) external view returns (bool, uint256, address)',
]);

const isHex64 = (s: string) => /^[a-f0-9]{64}$/i.test(s);
const isTxHash = (s: string) => s.startsWith('0x') && s.length === 66 && isHex64(s.slice(2));

export type LookupResult =
  | { status: 'found'; record: ChainRecord }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export const findRecordByHashDetailed = async (input: string): Promise<LookupResult> => {
  const hash = input.trim().toLowerCase();

  if (!hash) return { status: 'error', error: 'Empty lookup input' };

  // TX lookups go through the server because they need calldata decoding.
  if (isTxHash(hash)) {
    try {
      const response = await fetch(`/api/verify?hash=${encodeURIComponent(hash)}`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'found',
          record: {
            hash: data.hash,
            timestamp: data.timestamp,
            blockHeight: data.blockHeight || 0,
            sender: data.sender,
            fileName: data.fileName || 'On-Chain Asset',
            provenanceType: data.provenanceType || 'UPLOAD',
            txHash: hash,
            isSimulation: false,
          },
        };
      }
      if (response.status === 404) return { status: 'not_found' };
      const body = await response.json().catch(() => ({}));
      return { status: 'error', error: body.error || `API lookup failed (${response.status})` };
    } catch (e) {
      return {
        status: 'error',
        error: e instanceof Error ? e.message : 'Network error during TX lookup',
      };
    }
  }

  if (!isHex64(hash)) {
    return { status: 'error', error: 'Input must be a 64-char hex SHA-256 or a 0x-prefixed tx id' };
  }

  try {
    const [exists, timestamp, sender] = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'verify',
      args: [hash],
    });
    if (!exists) return { status: 'not_found' };
    return {
      status: 'found',
      record: {
        hash,
        timestamp: Number(timestamp) * 1000,
        blockHeight: 0,
        sender,
        fileName: 'On-Chain Asset',
        provenanceType: 'UPLOAD',
        isSimulation: false,
      },
    };
  } catch (e) {
    return {
      status: 'error',
      error: e instanceof Error ? e.message : 'Chain read failed',
    };
  }
};

/**
 * @deprecated Use findRecordByHashDetailed so callers can distinguish not-found from errors.
 * Kept for backwards compatibility — a null return now means either case.
 */
export const findRecordByHash = async (hash: string): Promise<ChainRecord | null> => {
  const result = await findRecordByHashDetailed(hash);
  return result.status === 'found' ? result.record : null;
};

export const writeHashToChain = async (
  hash: string,
  fileName: string,
  provenanceType: 'UPLOAD' | 'LIVE_CAPTURE' = 'UPLOAD',
  geoTag?: string
): Promise<ChainRecord> => {
  if (!isHex64(hash)) {
    throw new Error('Hash must be a 64-char lowercase hex SHA-256');
  }

  const response = await fetch('/api/certify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, fileName }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 429 && errData.retryAfterSec) {
      throw new Error(`Rate limited — try again in ${errData.retryAfterSec}s`);
    }
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
    isSimulation: false,
  };
};
