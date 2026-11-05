import { describe, expect, it } from 'vitest';
import { alikePairs, likelyMeant, looksAlike, nameCore, pairKey } from './stapleSimilarity';

describe('nameCore', () => {
  it('drops plural and feminine endings, final letters and marks', () => {
    expect(nameCore('עגבניה')).toBe(nameCore('עגבניות'));
    expect(nameCore('ביצה')).toBe(nameCore('ביצים'));
    expect(nameCore('מלפפון')).toBe(nameCore('מלפפונים'));
    expect(nameCore('קוטג׳')).toBe(nameCore("קוטג'"));
  });
});

describe('looksAlike', () => {
  it('finds the same product written differently', () => {
    expect(looksAlike('עגבניה', 'עגבניות')).toBe(true);
    expect(looksAlike('ביצים', 'ביצה')).toBe(true);
    expect(looksAlike('קורנפלקס', 'קורנפלקסס')).toBe(true);
    expect(looksAlike('חלב', 'חלב ')).toBe(false);
  });

  it('keeps different products apart', () => {
    expect(looksAlike('חלב', 'לחם')).toBe(false);
    expect(looksAlike('תפוח', 'תפוז')).toBe(false);
    expect(looksAlike('חלב 3%', 'חלב 1%')).toBe(false);
  });
});

describe('alikePairs and likelyMeant', () => {
  const rows = [{ title: 'עגבניות' }, { title: 'עגבניה' }, { title: 'לחם' }];

  it('pairs likely duplicates, except those marked apart', () => {
    expect(alikePairs(rows, new Set()).map(([a, b]) => [a.title, b.title])).toEqual([
      ['עגבניות', 'עגבניה'],
    ]);
    expect(alikePairs(rows, new Set([pairKey('עגבניה', 'עגבניות')]))).toEqual([]);
  });

  it('suggests what a new name most likely means', () => {
    expect(likelyMeant('עגבנייה', rows, new Set())?.title).toBe('עגבניות');
    expect(likelyMeant('לחם', rows, new Set())).toBeNull();
    expect(likelyMeant('גבינה', rows, new Set())).toBeNull();
  });
});
