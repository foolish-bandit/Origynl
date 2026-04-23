import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  LEDGER_ABI,
  polygonAmoy,
  publicAmoyClient,
  sanitizePrivateKey,
  walletAmoyClient,
} from './_lib/chain';
import { clientIp, rateLimit } from './_lib/rateLimit';

const BodySchema = z.object({
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, 'hash must be a lowercase 64-char hex SHA-256')
    .transform((s) => s.toLowerCase()),
  fileName: z.string().min(1).max(512).optional(),
});

const RECEIPT_TIMEOUT_MS = 60_000;
const RATE_LIMIT_PER_MIN = Number(process.env.CERTIFY_RATE_LIMIT ?? '10');
const DAILY_GAS_CAP_POL = Number(process.env.DAILY_GAS_CAP_POL ?? '0');

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = await rateLimit('certify', clientIp(req), RATE_LIMIT_PER_MIN, 60);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests', retryAfterSec: limit.retryAfterSec });
  }

  const privateKey = sanitizePrivateKey(process.env.PRIVATE_KEY);
  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!privateKey || !contractAddress) {
    console.error('[certify] Missing or invalid PRIVATE_KEY / CONTRACT_ADDRESS');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
  }
  const { hash } = parsed.data;

  try {
    const publicClient = publicAmoyClient();
    const { account, client: walletClient } = walletAmoyClient(privateKey);

    const [exists] = await publicClient.readContract({
      address: contractAddress,
      abi: LEDGER_ABI,
      functionName: 'verify',
      args: [hash],
    });

    if (exists) {
      return res.status(409).json({ error: 'Document already certified.' });
    }

    if (DAILY_GAS_CAP_POL > 0) {
      const gasCheck = await rateLimit(
        'gas-daily',
        account.address.toLowerCase(),
        Math.floor(DAILY_GAS_CAP_POL * 1000),
        24 * 60 * 60
      );
      if (!gasCheck.ok) {
        res.setHeader('Retry-After', String(gasCheck.retryAfterSec));
        return res.status(503).json({ error: 'Sponsor daily cap reached' });
      }
    }

    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: LEDGER_ABI,
      functionName: 'certify',
      args: [hash],
      account,
      chain: polygonAmoy,
    });

    const txHash = await walletClient.writeContract(request);
    console.log(`[certify] sent tx=${txHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: RECEIPT_TIMEOUT_MS,
      confirmations: 1,
      retryCount: 3,
    });

    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    const timestamp = Number(block.timestamp) * 1000;

    return res.status(200).json({
      success: true,
      txHash: receipt.transactionHash,
      blockHeight: Number(receipt.blockNumber),
      timestamp,
      sender: account.address,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Transaction failed';
    console.error('[certify] error:', message);
    return res.status(500).json({ error: message });
  }
}
