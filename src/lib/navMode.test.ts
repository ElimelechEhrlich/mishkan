import { describe, expect, it } from 'vitest';
import { navModeAfter } from './navMode';

describe('navModeAfter', () => {
  it('follows the tabs, and keeps the bar on any other page', () => {
    expect(navModeAfter('/home', 'main')).toBe('home');
    expect(navModeAfter('/', 'home')).toBe('main');
    expect(navModeAfter('/debts', 'home')).toBe('main');
    expect(navModeAfter('/item/abc', 'home')).toBe('home');
    expect(navModeAfter('/item/abc', 'main')).toBe('main');
    expect(navModeAfter('/search', 'home')).toBe('home');
  });
});
