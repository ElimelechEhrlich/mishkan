import { describe, expect, it } from 'vitest';
import { splitQuantity } from './quantity';

describe('splitQuantity', () => {
  it('takes a number at the end or the start as the quantity', () => {
    expect(splitQuantity('חלב 3')).toEqual({ name: 'חלב', quantity: '3' });
    expect(splitQuantity('3 חלב')).toEqual({ name: 'חלב', quantity: '3' });
    expect(splitQuantity('חלב x3')).toEqual({ name: 'חלב', quantity: '3' });
    expect(splitQuantity('חלב ×2')).toEqual({ name: 'חלב', quantity: '2' });
    expect(splitQuantity('  ביצים   12 ')).toEqual({ name: 'ביצים', quantity: '12' });
  });

  it('keeps a counted or weighed unit with the number', () => {
    expect(splitQuantity('עגבניות 2 ק"ג')).toEqual({ name: 'עגבניות', quantity: '2 ק"ג' });
    expect(splitQuantity('עגבניות 1.5 קילו')).toEqual({ name: 'עגבניות', quantity: '1.5 קילו' });
    expect(splitQuantity('2 חבילות קוטג׳')).toEqual({ name: 'קוטג׳', quantity: '2 חבילות' });
    expect(splitQuantity('גבינה צהובה 200 גרם')).toEqual({
      name: 'גבינה צהובה',
      quantity: '200 גרם',
    });
  });

  it('leaves in the name what tells one product from another', () => {
    expect(splitQuantity('חלב 3%')).toEqual({ name: 'חלב 3%', quantity: null });
    expect(splitQuantity('קולה 1.5 ליטר')).toEqual({ name: 'קולה 1.5 ליטר', quantity: null });
    expect(splitQuantity('ויטמין D 1000')).toEqual({ name: 'ויטמין D 1000', quantity: null });
    expect(splitQuantity('לחם')).toEqual({ name: 'לחם', quantity: null });
    expect(splitQuantity('ויטמין D3')).toEqual({ name: 'ויטמין D3', quantity: null });
    expect(splitQuantity('42')).toEqual({ name: '42', quantity: null });
  });
});
