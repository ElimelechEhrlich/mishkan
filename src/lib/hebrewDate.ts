import { addDays } from './itemRules';

/** Reads a date in the Hebrew calendar. English month names are stable keys to compare. */
const partsFormat = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

type HebrewParts = {
  readonly day: number;
  readonly month: string;
  readonly year: number;
};

const monthNames: Readonly<Record<string, string>> = {
  Tishri: 'תשרי',
  Heshvan: 'חשוון',
  Kislev: 'כסלו',
  Tevet: 'טבת',
  Shevat: 'שבט',
  'Adar I': 'אדר א׳',
  Adar: 'אדר',
  'Adar II': 'אדר ב׳',
  Nisan: 'ניסן',
  Iyar: 'אייר',
  Sivan: 'סיוון',
  Tamuz: 'תמוז',
  Av: 'אב',
  Elul: 'אלול',
};

const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'] as const;
const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'] as const;
const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'] as const;

function utc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function hebrewParts(isoDate: string): HebrewParts {
  const parts = partsFormat.formatToParts(utc(isoDate));
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return { day: Number(value('day')), month: value('month'), year: Number(value('year')) };
}

/** A number in Hebrew letters, as days and years are written: ט״ו, תשפ״ז. */
export function hebrewNumeral(value: number): string {
  const n = value % 1000;
  const letters =
    `${hundreds[Math.floor(n / 100)] ?? ''}${tens[Math.floor((n % 100) / 10)] ?? ''}${ones[n % 10] ?? ''}`
      .replace(/יה$/, 'טו')
      .replace(/יו$/, 'טז');
  if (letters.length <= 1) {
    return `${letters}׳`;
  }
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

/** The Hebrew date of a day, such as ט״ו בתשרי, with the year when asked: ט״ו בתשרי תשפ״ז. */
export function formatHebrewDate(isoDate: string, withYear: boolean): string {
  const parts = hebrewParts(isoDate);
  const date = `${hebrewNumeral(parts.day)} ב${monthNames[parts.month] ?? parts.month}`;
  return withYear ? `${date} ${hebrewNumeral(parts.year)}` : date;
}

/** The Hebrew date of a birth; after sunset it is already the next day. */
export function hebrewBirthDate(birthDate: string, afterSunset: boolean): string {
  return afterSunset ? addDays(birthDate, 1) : birthDate;
}

/**
 * Whether a Hebrew month counts as the month of birth. Born in Adar of a plain year,
 * the birthday falls in Adar II of a leap year; born in Adar I or II, it falls in
 * Adar of a plain year.
 */
function sameMonth(birthMonth: string, month: string): boolean {
  if (birthMonth === month) {
    return true;
  }
  if (birthMonth === 'Adar') {
    return month === 'Adar II';
  }
  if (birthMonth === 'Adar I' || birthMonth === 'Adar II') {
    return month === 'Adar';
  }
  return false;
}

/**
 * The next day, from `today` on, that is the Hebrew birthday of someone born on
 * `birthDate`. Born on the 30th of a month that has only 29 days this year, the
 * birthday is on the 1st of the month after.
 */
export function nextHebrewBirthday(
  birthDate: string,
  afterSunset: boolean,
  today: string,
): string | null {
  const birth = hebrewParts(hebrewBirthDate(birthDate, afterSunset));
  let previous = hebrewParts(addDays(today, -1));
  for (let offset = 0; offset < 400; offset += 1) {
    const date = addDays(today, offset);
    const parts = hebrewParts(date);
    const exact = parts.day === birth.day && sameMonth(birth.month, parts.month);
    const thirtiethMissing =
      birth.day === 30 &&
      parts.day === 1 &&
      previous.day === 29 &&
      sameMonth(birth.month, previous.month);
    if (exact || thirtiethMissing) {
      return date;
    }
    previous = parts;
  }
  return null;
}

/** Whole years from a birth date to today. */
export function ageInYears(birthDate: string, today: string): number {
  const [birthYear, birthMonthDay] = [Number(birthDate.slice(0, 4)), birthDate.slice(5)];
  const [year, monthDay] = [Number(today.slice(0, 4)), today.slice(5)];
  return year - birthYear - (monthDay < birthMonthDay ? 1 : 0);
}

/** Days from one date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
}

/** The Hebrew year a day falls in. */
export function hebrewYearOf(isoDate: string): number {
  return hebrewParts(isoDate).year;
}

/** The day, month (its calendar name) and year of a day in the Hebrew calendar. */
export function hebrewDateOf(isoDate: string): HebrewParts {
  return hebrewParts(isoDate);
}

/** The first day of a Hebrew year, Rosh Hashana: in September or October of the year before. */
function roshHashana(year: number): string {
  const gregorian = year - 3761;
  for (let day = `${String(gregorian)}-09-01`; ; day = addDays(day, 1)) {
    const parts = hebrewParts(day);
    if (parts.year === year && parts.month === 'Tishri' && parts.day === 1) {
      return day;
    }
  }
}

/** The months of a Hebrew year in order, each with its Hebrew name and how many days it has. */
export function hebrewMonths(
  year: number,
): { readonly month: string; readonly name: string; readonly days: number }[] {
  const months: { month: string; name: string; days: number }[] = [];
  let day = roshHashana(year);
  for (;;) {
    const parts = hebrewParts(day);
    if (parts.year !== year) {
      return months;
    }
    const last = months.at(-1);
    if (last?.month === parts.month) {
      last.days = parts.day;
    } else {
      months.push({ month: parts.month, name: monthNames[parts.month] ?? parts.month, days: 1 });
    }
    day = addDays(day, 1);
  }
}

/** Whether a Hebrew year has two Adars. */
export function isHebrewLeapYear(year: number): boolean {
  return hebrewMonths(year).length === 13;
}

/**
 * The day (YYYY-MM-DD) of a Hebrew date, such as כ״ו באייר תשפ״ז. A day past the end of its
 * month (the 30th of a 29-day month) is taken as the month's last day; plain Adar in a leap
 * year is Adar II, and Adar I or II in a plain year is Adar.
 */
export function isoFromHebrew(year: number, month: string, day: number): string | null {
  const months = hebrewMonths(year);
  const wanted =
    months.find((entry) => entry.month === month) ??
    months.find((entry) =>
      month === 'Adar'
        ? entry.month === 'Adar II'
        : month.startsWith('Adar') && entry.month === 'Adar',
    );
  if (wanted === undefined) {
    return null;
  }
  let offset = 0;
  for (const entry of months) {
    if (entry === wanted) {
      return addDays(roshHashana(year), offset + Math.min(day, entry.days) - 1);
    }
    offset += entry.days;
  }
  return null;
}
