import { describe, expect, it } from 'vitest';
import { limitEmoji } from './emoji';

describe('limitEmoji', () => {
  it('keeps whole emoji, joined ones counted as one', () => {
    expect(limitEmoji('👨‍👩‍👧🐶🐱', 2)).toBe('👨‍👩‍👧🐶');
    expect(limitEmoji('⚽', 2)).toBe('⚽');
  });

  it('never keeps more than the database stores', () => {
    expect(limitEmoji('👨‍👩‍👧‍👦👨‍👩‍👧‍👦', 2).length).toBeLessThanOrEqual(16);
  });
});
