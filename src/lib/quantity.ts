/**
 * Counted and weighed units: written with a number, they are how much to buy, not part of
 * the product's name. Volumes ("1.5 ליטר") and percents ("3%") stay in the name: they tell
 * one product from another.
 */
const units = [
  'יחידות',
  "יח'",
  'יח׳',
  'יח',
  'חבילות',
  'חבילה',
  'שקיות',
  'שקית',
  'בקבוקים',
  'קרטונים',
  'קרטון',
  'מארזים',
  'מארז',
  'קופסאות',
  'קופסה',
  'ק"ג',
  'ק״ג',
  'קג',
  'קילו',
  'גרם',
  "גר'",
  'גר׳',
  'גר',
];

const unit = `(?:${units.join('|')})`;
const number = '\\d+(?:[.,]\\d+)?(?:\\/\\d+)?';
/** "חלב 3", "חלב x3", "עגבניות 2 ק"ג"; apart from the name, so "ויטמין D3" stays whole. */
const atEnd = new RegExp(`^(.*?\\S)(?:\\s+|\\s*[x×*]\\s*)(${number})(?:\\s*(${unit}))?\\s*$`, 'u');
/** "3 חלב", "x3 חלב", "2 ק"ג עגבניות". */
const atStart = new RegExp(`^(?:[x×*]\\s*)?(${number})(?:\\s*(${unit}))?\\s+(\\S.*)$`, 'u');

/** A bare number is a quantity only when small: "ויטמין D 1000" is a product. */
const largestBare = 99;

function isQuantity(amount: string, withUnit: string | undefined): boolean {
  return withUnit !== undefined || Number(amount.replace(',', '.').split('/')[0]) <= largestBare;
}

/**
 * A line of a shopping list as the product and how much of it: the number (and unit) at its
 * end or its start, as "חלב 3", "3 חלב", "חלב x3" or "עגבניות 2 ק"ג". A name with no such
 * number, or that is only a number, stays whole.
 */
export function splitQuantity(line: string): {
  readonly name: string;
  readonly quantity: string | null;
} {
  const text = line.trim().replace(/\s+/g, ' ');
  const end = atEnd.exec(text);
  if (end !== null) {
    const [, name = '', amount = '', withUnit] = end;
    if (!/^\d/.test(name) && /\D/.test(name) && isQuantity(amount, withUnit)) {
      return {
        name: name.trim(),
        quantity: withUnit === undefined ? amount : `${amount} ${withUnit}`,
      };
    }
  }
  const start = atStart.exec(text);
  if (start !== null) {
    const [, amount = '', withUnit, name = ''] = start;
    if (/\D/.test(name) && !name.startsWith('%') && isQuantity(amount, withUnit)) {
      return {
        name: name.trim(),
        quantity: withUnit === undefined ? amount : `${amount} ${withUnit}`,
      };
    }
  }
  return { name: text, quantity: null };
}
