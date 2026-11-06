import { describe, expect, it } from 'vitest';
import {
  alikePairs,
  groupPairs,
  knownStart,
  likelyMeant,
  looksAlike,
  nameCore,
  pairKey,
} from './stapleSimilarity';

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

describe('groupPairs', () => {
  const fairy = { title: 'פיירי' };
  const liquid = { title: 'נוזל כלים' };
  const soap = { title: 'סבון כלים' };
  const tomato = { title: 'עגבניה' };
  const tomatoes = { title: 'עגבניות' };
  const rows = [fairy, liquid, soap, tomato, tomatoes];
  const found: [{ title: string }, { title: string }][] = [[tomato, tomatoes]];

  it('pairs each name of a group with its first, skipping what is known', () => {
    const groups = [
      ['פיירי', 'נוזל כלים', 'סבון כלים', 'מלח'],
      ['עגבניה', 'עגבניות'],
    ];
    expect(groupPairs(groups, rows, new Set(), found).map(([a, b]) => [a.title, b.title])).toEqual([
      ['פיירי', 'נוזל כלים'],
      ['פיירי', 'סבון כלים'],
    ]);
    expect(groupPairs(groups, rows, new Set([pairKey('פיירי', 'סבון כלים')]), found).length).toBe(
      1,
    );
  });
});

describe('knownStart', () => {
  const rows = [{ title: 'מרכך כביסה' }, { title: 'מרכך' }, { title: 'חלב' }];

  it('finds the longest name the new one starts with, and the rest as details', () => {
    const found = knownStart('מרכך כביסה מקסימה גדול', rows, new Set());
    expect(found?.row.title).toBe('מרכך כביסה');
    expect(found?.rest).toBe('מקסימה גדול');
  });

  it('says nothing for a name on the list, a word that only starts alike, or one marked apart', () => {
    expect(knownStart('חלב', rows, new Set())).toBeNull();
    expect(knownStart('חלבה', rows, new Set())).toBeNull();
    expect(knownStart('חלב עיזים', rows, new Set([pairKey('חלב עיזים', 'חלב')]))).toBeNull();
  });
});
