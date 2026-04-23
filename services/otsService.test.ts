import { describe, it, expect } from 'vitest';
import { decodeBase64ToBytes } from './otsService';

describe('otsService helpers', () => {
  it('decodeBase64ToBytes round-trips ASCII', () => {
    const bytes = decodeBase64ToBytes('SGVsbG8='); // "Hello"
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it('decodeBase64ToBytes handles binary payloads', () => {
    const src = new Uint8Array([0x00, 0xff, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60]);
    const base64 = Buffer.from(src).toString('base64');
    const round = decodeBase64ToBytes(base64);
    expect(Array.from(round)).toEqual(Array.from(src));
  });

  it('decodeBase64ToBytes returns empty for empty input', () => {
    expect(decodeBase64ToBytes('').length).toBe(0);
  });
});
