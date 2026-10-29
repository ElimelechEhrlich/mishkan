import { describe, expect, it } from 'vitest';
import { encodeWav, formatElapsed, toBase64 } from './audio';

describe('formatElapsed', () => {
  it('shows minutes and two-digit seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7.8)).toBe('0:07');
    expect(formatElapsed(83)).toBe('1:23');
    expect(formatElapsed(-3)).toBe('0:00');
  });
});

describe('encodeWav', () => {
  it('writes a mono 16-bit header and clipped samples', () => {
    const bytes = encodeWav(new Float32Array([0, 1, -1, 2]), 16000);
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...bytes.subarray(8, 12))).toBe('WAVE');
    expect(bytes.length).toBe(44 + 8);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });
});

describe('toBase64', () => {
  it('matches the standard encoding, also past one chunk', () => {
    expect(toBase64(new Uint8Array([104, 105]))).toBe('aGk=');
    const long = new Uint8Array(70000).map((_, index) => index % 256);
    expect(toBase64(long)).toBe(Buffer.from(long).toString('base64'));
  });
});
