import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { clientIp, rateLimit } from './_lib/rateLimit';

const Body = z.object({
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, 'hash must be a lowercase 64-char hex SHA-256')
    .transform((s) => s.toLowerCase()),
});

const RATE_LIMIT_PER_MIN = Number(process.env.OTS_RATE_LIMIT ?? '30');
const STAMP_TIMEOUT_MS = 20_000;

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

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

  const limit = await rateLimit('ots-stamp', clientIp(req), RATE_LIMIT_PER_MIN, 60);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests', retryAfterSec: limit.retryAfterSec });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  try {
    // Dynamic import keeps the cold-start cost off other endpoints.
    const OpenTimestamps = (await import('javascript-opentimestamps')).default ?? (await import('javascript-opentimestamps'));
    const Ops = OpenTimestamps.Ops;
    const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

    const hashBytes = hexToBuffer(parsed.data.hash);
    const detached = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), hashBytes);

    await withTimeout(OpenTimestamps.stamp(detached), STAMP_TIMEOUT_MS, 'OpenTimestamps.stamp');
    const serialized: Buffer = detached.serializeToBytes();

    return res.status(200).json({
      hash: parsed.data.hash,
      otsBase64: serialized.toString('base64'),
      // Bitcoin anchor completes asynchronously; verifiers should re-upgrade
      // in ~1–6 hours to collapse the calendar-server attestation into a
      // block-header proof.
      pending: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'OpenTimestamps stamp failed';
    console.error('[ots-stamp] error:', message);
    return res.status(503).json({ error: message, pending: false });
  }
}
