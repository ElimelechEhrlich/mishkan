import { describe, expect, it } from 'vitest';
import { shareable } from './shared';

describe('shareable', () => {
  it('sends a request once while it is on its way, and anew after', async () => {
    let sent = 0;
    const ask = shareable(async () => {
      sent += 1;
      await Promise.resolve();
      return sent;
    });
    const [a, b] = await Promise.all([ask(), ask()]);
    expect([a, b, sent]).toEqual([1, 1, 1]);
    expect(await ask()).toBe(2);
  });
});
