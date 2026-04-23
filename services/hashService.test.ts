import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { computeFileHash, computeCompositeHash } from './hashService';

// vitest runs in Node; polyfill crypto.subtle if missing.
if (!globalThis.crypto) {
  // @ts-expect-error — install webcrypto onto globalThis for the test env
  globalThis.crypto = webcrypto;
}

function blobOf(text: string): Blob {
  return new Blob([new TextEncoder().encode(text)]);
}

describe('hashService', () => {
  it('computeFileHash is deterministic and 64-char lowercase hex', async () => {
    const a = await computeFileHash(blobOf('hello origynl'));
    const b = await computeFileHash(blobOf('hello origynl'));
    expect(a).toEqual(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('single-byte mutation produces a totally different hash', async () => {
    const a = await computeFileHash(blobOf('hello origynl'));
    const b = await computeFileHash(blobOf('Hello origynl'));
    expect(a).not.toEqual(b);
  });

  it('computeCompositeHash is deterministic given the same sensors', async () => {
    const sensors = {
      gps: { lat: 40.7128, lng: -74.006, accuracy: 8 },
      timestamp: 1_700_000_000_000,
    };
    const a = await computeCompositeHash(blobOf('photo'), sensors);
    const b = await computeCompositeHash(blobOf('photo'), sensors);
    expect(a).toEqual(b);
  });

  it('composite hash tolerates sub-centimetre GPS drift via rounding', async () => {
    const s1 = { gps: { lat: 40.7128000, lng: -74.0060000, accuracy: 8 }, timestamp: 42 };
    const s2 = { gps: { lat: 40.7128001, lng: -74.0060001, accuracy: 8 }, timestamp: 42 };
    const a = await computeCompositeHash(blobOf('photo'), s1);
    const b = await computeCompositeHash(blobOf('photo'), s2);
    expect(a).toEqual(b);
  });

  it('composite hash differs for different timestamps', async () => {
    const base = { gps: { lat: 1, lng: 1, accuracy: 1 }, timestamp: 100 };
    const later = { ...base, timestamp: 101 };
    const a = await computeCompositeHash(blobOf('photo'), base);
    const b = await computeCompositeHash(blobOf('photo'), later);
    expect(a).not.toEqual(b);
  });

  it('composite hash is not influenced by Date.now (retry-safe)', async () => {
    // Regression: previous implementation mixed in Date.now(), so two retries
    // of the same capture yielded different hashes. Now it must not.
    const sensors = { timestamp: 12345 };
    const a = await computeCompositeHash(blobOf('f'), sensors);
    await new Promise((r) => setTimeout(r, 25));
    const b = await computeCompositeHash(blobOf('f'), sensors);
    expect(a).toEqual(b);
  });
});
