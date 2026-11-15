import { describe, expect, it } from 'vitest';
import { inShopApp, shopPathOf } from './shopApp';

describe('the shopping app', () => {
  it("is the pages under /shop, not the main app's shopping page", () => {
    expect(inShopApp('/shop')).toBe(true);
    expect(inShopApp('/shop/staples')).toBe(true);
    expect(inShopApp('/shopping')).toBe(false);
  });

  it('keeps its shopping pages and items under /shop', () => {
    expect(shopPathOf('/shopping', true)).toBe('/shop');
    expect(shopPathOf('/shopping?category=food', true)).toBe('/shop?category=food');
    expect(shopPathOf('/shopping/run/r1', true)).toBe('/shop/run/r1');
    expect(shopPathOf('/item/i1', true)).toBe('/shop/item/i1');
    expect(shopPathOf('/home', true)).toBe('/home');
    expect(shopPathOf('/shopping/staples', false)).toBe('/shopping/staples');
  });
});
