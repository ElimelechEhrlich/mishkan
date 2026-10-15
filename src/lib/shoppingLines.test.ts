import { describe, expect, it } from 'vitest';
import { shoppingLines } from './shoppingLines';

describe('a shopping list written as a message', () => {
  it('makes an item of each line', () => {
    expect(shoppingLines('חלב\nביצים\nלחם')).toEqual(['חלב', 'ביצים', 'לחם']);
  });

  it('leaves out marks, empty lines and repeats from a pasted list', () => {
    expect(shoppingLines('- חלב\n• ביצים\n\n1. לחם 2 כיכרות\n2) חלב\n   ')).toEqual([
      'חלב',
      'ביצים',
      'לחם 2 כיכרות',
    ]);
  });

  it('has nothing for nothing written', () => {
    expect(shoppingLines(' \n \n')).toEqual([]);
  });
});
