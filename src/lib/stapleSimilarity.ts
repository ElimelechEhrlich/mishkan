import { titleKey } from './departments';

const finals: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * The core of a product's name, for telling names that mean the same apart from their
 * spelling: no marks or points, final letters as plain ones, and no plural or feminine
 * ending ("עגבניה" and "עגבניות" are "עגבני"; "ביצה" and "ביצים" are "ביצ").
 */
export function nameCore(title: string): string {
  const plain = titleKey(title)
    .normalize('NFD')
    .replace(/[֑-ׇ]/g, '')
    .replace(/["'׳״`.,-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[ךםןףץ]/g, (letter) => finals[letter] ?? letter);
  return plain
    .split(' ')
    .map((word) =>
      word.length > 3 && /(ימ|ות)$/.test(word)
        ? word.slice(0, -2)
        : word.length > 2 && /[הית]$/.test(word)
          ? word.slice(0, -1)
          : word,
    )
    .join(' ');
}

/** How many letters must change to turn one word into the other. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const kept = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = kept;
    }
  }
  return row[b.length] ?? 0;
}

/**
 * Whether two different names are likely the same product: the same core, or cores a letter
 * apart (a typo) when long enough for one letter not to make another word ("תפוח" and
 * "תפוז" are not).
 */
export function looksAlike(a: string, b: string): boolean {
  if (titleKey(a) === titleKey(b)) {
    return false;
  }
  const x = nameCore(a);
  const y = nameCore(b);
  // Numbers tell products apart ("חלב 3%" and "חלב 1%"): a typo is only between words.
  const numbers = (core: string): string => core.replace(/\D/g, '');
  return (
    x === y ||
    (numbers(x) === numbers(y) && Math.min(x.length, y.length) >= 5 && distance(x, y) <= 1)
  );
}

/** The order-free key of a pair of names, as kept when a pair is marked "not the same". */
export function pairKey(a: string, b: string): string {
  return [titleKey(a), titleKey(b)].sort().join('|');
}

/** Pairs of names on a list that are likely the same product, except those marked not to be. */
export function alikePairs<T extends { readonly title: string }>(
  rows: readonly T[],
  apart: ReadonlySet<string>,
): [T, T][] {
  const pairs: [T, T][] = [];
  rows.forEach((row, index) => {
    for (const other of rows.slice(index + 1)) {
      if (looksAlike(row.title, other.title) && !apart.has(pairKey(row.title, other.title))) {
        pairs.push([row, other]);
      }
    }
  });
  return pairs;
}

/**
 * The name on the list that a new one most likely means, when it is not on the list as
 * written; null when there is none.
 */
export function likelyMeant<T extends { readonly title: string }>(
  name: string,
  rows: readonly T[],
  apart: ReadonlySet<string>,
): T | null {
  if (rows.some((row) => titleKey(row.title) === titleKey(name))) {
    return null;
  }
  return (
    rows.find((row) => looksAlike(name, row.title) && !apart.has(pairKey(name, row.title))) ?? null
  );
}

/**
 * The groups of names the smart check called one product, as pairs of rows of the list: each
 * name with the first of its group. Names not on the list, pairs marked apart and pairs already
 * found by spelling are left out.
 */
export function groupPairs<T extends { readonly title: string }>(
  groups: readonly (readonly string[])[],
  rows: readonly T[],
  apart: ReadonlySet<string>,
  found: readonly (readonly [T, T])[],
): [T, T][] {
  const byKey = new Map(rows.map((row) => [titleKey(row.title), row]));
  const seen = new Set([...apart, ...found.map(([a, b]) => pairKey(a.title, b.title))]);
  const pairs: [T, T][] = [];
  for (const group of groups) {
    const members = [...new Set(group.map(titleKey))].flatMap((key) => {
      const row = byKey.get(key);
      return row === undefined ? [] : [row];
    });
    const [first, ...rest] = members;
    if (first === undefined) {
      continue;
    }
    for (const row of rest) {
      const key = pairKey(first.title, row.title);
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([first, row]);
      }
    }
  }
  return pairs;
}
