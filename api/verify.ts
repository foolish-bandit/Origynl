import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decodeFunctionData } from 'viem';
import { z } from 'zod';
import { LEDGER_ABI, publicAmoyClient } from './_lib/chain';
import { clientIp, rateLimit } from './_lib/rateLimit';

const QuerySchema = z.string().refine(
  (s) => /^0x[a-f0-9]{64}$/i.test(s) || /^[a-f0-9]{64}$/i.test(s),
  'hash must be a 64-char hex (file SHA-256) or 0x-prefixed 64-char hex (tx id)'
);

const RATE_LIMIT_PER_MIN = Number(process.env.VERIFY_RATE_LIMIT ?? '60');

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const limit = await rateLimit('verify', clientIp(req), RATE_LIMIT_PER_MIN, 60);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests', retryAfterSec: limit.retryAfterSec });
  }

  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!contractAddress) return res.status(500).json({ error: 'Server misconfigured' });

  const rawHash = req.query.hash;
  if (typeof rawHash !== 'string') {
    return res.status(400).json({ error: 'Missing hash parameter' });
  }
  const parsed = QuerySchema.safeParse(rawHash.trim());
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid hash parameter' });
  }
  const hash = parsed.data.toLowerCase();
  const isTxLookup = hash.startsWith('0x') && hash.length === 66;

  try {
    const publicClient = publicAmoyClient();
    let fileHashToVerify = hash;
    let blockHeight = 0;

    if (isTxLookup) {
      const tx = await publicClient.getTransaction({ hash: hash as `0x${string}` });
      if (!tx) return res.status(404).json({ found: false });
      if (tx.blockNumber !== null) blockHeight = Number(tx.blockNumber);
      try {
        const { args } = decodeFunctionData({ abi: LEDGER_ABI, data: tx.input });
        if (args && typeof args[0] === 'string' && /^[a-f0-9]{64}$/i.test(args[0])) {
          fileHashToVerify = args[0].toLowerCase();
        } else {
          return res.status(404).json({ found: false, reason: 'tx does not contain a file hash' });
        }
      } catch {
        return res.status(404).json({ found: false, reason: 'tx did not call a known function' });
      }
    }

    const [exists, timestamp, sender] = await publicClient.readContract({
      address: contractAddress,
      abi: LEDGER_ABI,
      functionName: 'verify',
      args: [fileHashToVerify],
    });

    if (!exists) return res.status(404).json({ found: false });

    return res.status(200).json({
      hash: fileHashToVerify,
      timestamp: Number(timestamp) * 1000,
      sender,
      blockHeight,
      fileName: isTxLookup ? 'Recovered via Ledger Ref' : 'On-Chain Record',
      provenanceType: 'UPLOAD',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    console.error('[verify] error:', message);
    return res.status(500).json({ error: message });
  }
}
