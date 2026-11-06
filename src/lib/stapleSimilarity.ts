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

/** Whether one letter added, taken out or changed turns one text into the other. */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) {
    i += 1;
  }
  // The rest after the first difference: the same once one letter is skipped or changed.
  return short.length === long.length
    ? short.slice(i + 1) === long.slice(i + 1)
    : short.slice(i) === long.slice(i + 1);
}

/** What two names are compared by, worked out once per name. */
type Prepared = { readonly key: string; readonly core: string; readonly numbers: string };

function prepare(title: string): Prepared {
  const core = nameCore(title);
  return { key: titleKey(title), core, numbers: core.replace(/\D/g, '') };
}

/**
 * Whether two different names are likely the same product: the same core, or cores a letter
 * apart (a typo) when long enough for one letter not to make another word ("תפוח" and
 * "תפוז" are not). Numbers tell products apart ("חלב 3%" and "חלב 1%").
 */
function alike(x: Prepared, y: Prepared): boolean {
  if (x.key === y.key) {
    return false;
  }
  return (
    x.core === y.core ||
    (x.numbers === y.numbers &&
      Math.min(x.core.length, y.core.length) >= 5 &&
      oneEditApart(x.core, y.core))
  );
}

/** Whether two different names are likely the same product (see `alike`). */
export function looksAlike(a: string, b: string): boolean {
  return alike(prepare(a), prepare(b));
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
  const prepared = rows.map((row) => prepare(row.title));
  const pairs: [T, T][] = [];
  prepared.forEach((x, i) => {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const y = prepared[j];
      const a = rows[i];
      const b = rows[j];
      if (y !== undefined && a !== undefined && b !== undefined && alike(x, y)) {
        if (!apart.has(pairKey(a.title, b.title))) {
          pairs.push([a, b]);
        }
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
  const x = prepare(name);
  if (rows.some((row) => titleKey(row.title) === x.key)) {
    return null;
  }
  return (
    rows.find((row) => alike(x, prepare(row.title)) && !apart.has(pairKey(name, row.title))) ?? null
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

/**
 * A name of the list that a new name starts with, word by word, and what the new name says
 * beyond it ("מרכך כביסה מקסימה" → "מרכך כביסה" and "מקסימה"): the details of a product on
 * the list. The longest such name; null when there is none or the new name is on the list.
 */
export function knownStart<T extends { readonly title: string }>(
  name: string,
  rows: readonly T[],
  apart: ReadonlySet<string>,
): { readonly row: T; readonly rest: string } | null {
  const key = titleKey(name);
  if (rows.some((row) => titleKey(row.title) === key)) {
    return null;
  }
  const words = name.trim().split(/\s+/);
  let best: { readonly row: T; readonly rest: string } | null = null;
  for (const row of rows) {
    const rowKey = titleKey(row.title);
    const length = rowKey.split(' ').length;
    if (
      key.startsWith(`${rowKey} `) &&
      !apart.has(pairKey(name, row.title)) &&
      (best === null || length > titleKey(best.row.title).split(' ').length)
    ) {
      best = { row, rest: words.slice(length).join(' ') };
    }
  }
  return best;
}
