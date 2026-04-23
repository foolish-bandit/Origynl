/**
 * OpenTimestamps adapter (client side).
 *
 * OTS is a free, Bitcoin-anchored proof-of-existence protocol. We use it as a
 * **second anchor** alongside Polygon: even if the OrigynlLedger contract
 * disappeared tomorrow, the Bitcoin calendar attestation keeps the record
 * verifiable. Stamping is best-effort and never blocks the Polygon write.
 *
 * Stamping is done in the serverless layer (/api/ots-stamp) because
 * `javascript-opentimestamps` assumes Node `Buffer`. The server accepts only
 * the 64-char hash — the file itself never crosses the wire, same as Polygon.
 */

export interface OtsStamp {
  hash: string;
  otsBase64: string;
  /** True until a Bitcoin block collapses the calendar attestation (~1–6h). */
  pending: boolean;
}

export interface OtsVerification {
  verified: boolean;
  anchored: boolean;
  bitcoinTimestamp: number | null;
  litecoinTimestamp: number | null;
  pending: boolean;
}

export async function stampHashViaOts(hash: string, signal?: AbortSignal): Promise<OtsStamp> {
  const res = await fetch('/api/ots-stamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `OTS stamp failed (${res.status})`);
  }
  return res.json();
}

export async function verifyOtsStamp(
  hash: string,
  otsBase64: string,
  signal?: AbortSignal
): Promise<OtsVerification> {
  const res = await fetch('/api/ots-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, otsBase64 }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `OTS verify failed (${res.status})`);
  }
  return res.json();
}

export function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
