import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { clientIp, rateLimit } from './_lib/rateLimit';

const Body = z.object({
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .transform((s) => s.toLowerCase()),
  otsBase64: z.string().min(1),
});

const RATE_LIMIT_PER_MIN = Number(process.env.OTS_RATE_LIMIT ?? '30');
const VERIFY_TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = await rateLimit('ots-verify', clientIp(req), RATE_LIMIT_PER_MIN, 60);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests', retryAfterSec: limit.retryAfterSec });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  try {
    const OpenTimestamps =
      (await import('javascript-opentimestamps')).default ??
      (await import('javascript-opentimestamps'));
    const Ops = OpenTimestamps.Ops;
    const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

    const otsBytes = Buffer.from(parsed.data.otsBase64, 'base64');
    const hashBytes = Buffer.from(parsed.data.hash, 'hex');

    const detachedHash = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), hashBytes);
    const detachedTs = DetachedTimestampFile.deserialize(otsBytes);

    // verify returns a map of attestation chain -> unix timestamp in the
    // current library version; treat any returned entry as "verified".
    const result = await withTimeout(
      OpenTimestamps.verify(detachedTs, detachedHash),
      VERIFY_TIMEOUT_MS,
      'OpenTimestamps.verify'
    );

    const bitcoinTs = result?.bitcoin?.timestamp;
    const litecoinTs = result?.litecoin?.timestamp;
    const anchored = Boolean(bitcoinTs || litecoinTs);

    return res.status(200).json({
      verified: Object.keys(result ?? {}).length > 0,
      anchored,
      bitcoinTimestamp: bitcoinTs ?? null,
      litecoinTimestamp: litecoinTs ?? null,
      pending: !anchored,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'OpenTimestamps verify failed';
    console.error('[ots-verify] error:', message);
    return res.status(503).json({ error: message });
  }
}
