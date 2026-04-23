import type { VercelRequest } from '@vercel/node';

type Verdict = { ok: true } | { ok: false; retryAfterSec: number };

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSec: number): Verdict {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count += 1;
  return { ok: true };
}

async function upstashLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<Verdict | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const pipelineBody = [
      ['INCR', key],
      ['EXPIRE', key, String(windowSec), 'NX'],
    ];
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipelineBody),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ result: unknown }>;
    const count = Number(json?.[0]?.result ?? 0);
    if (!Number.isFinite(count)) return null;
    if (count > limit) {
      const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ttlJson = ttlRes.ok ? ((await ttlRes.json()) as { result: number }) : null;
      const retryAfterSec = ttlJson?.result && ttlJson.result > 0 ? ttlJson.result : windowSec;
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  } catch {
    return null;
  }
}

export function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0].split(',')[0].trim();
  return req.headers['x-real-ip']?.toString() ?? 'unknown';
}

export async function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSec: number
): Promise<Verdict> {
  const composite = `origynl:rl:${bucket}:${key}`;
  const upstash = await upstashLimit(composite, limit, windowSec);
  if (upstash) return upstash;
  return memoryLimit(composite, limit, windowSec);
}
