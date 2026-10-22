import { describe, expect, it } from 'vitest';
import {
  ageInYears,
  daysBetween,
  formatHebrewDate,
  hebrewMonths,
  isHebrewLeapYear,
  isoFromHebrew,
  hebrewNumeral,
  nextHebrewBirthday,
} from './hebrewDate';

describe('hebrewNumeral', () => {
  it('writes days and years in letters, with 15 and 16 as ט״ו and ט״ז', () => {
    expect(hebrewNumeral(1)).toBe('א׳');
    expect(hebrewNumeral(15)).toBe('ט״ו');
    expect(hebrewNumeral(16)).toBe('ט״ז');
    expect(hebrewNumeral(30)).toBe('ל׳');
    expect(hebrewNumeral(5787)).toBe('תשפ״ז');
  });
});

describe('formatHebrewDate', () => {
  it('names the day, month and year', () => {
    expect(formatHebrewDate('2016-10-03', true)).toBe('א׳ בתשרי תשע״ז');
    expect(formatHebrewDate('2024-03-15', false)).toBe('ה׳ באדר ב׳');
  });
});

describe('nextHebrewBirthday', () => {
  it('finds the same Hebrew day in the coming year', () => {
    expect(nextHebrewBirthday('2016-10-03', false, '2026-10-11')).toBe('2027-10-02');
  });

  it('is today when today is the Hebrew birthday', () => {
    expect(nextHebrewBirthday('2016-10-03', false, '2027-10-02')).toBe('2027-10-02');
  });

  it('moves a birth after sunset to the next Hebrew day', () => {
    expect(nextHebrewBirthday('2016-10-02', true, '2026-10-11')).toBe('2027-10-02');
  });

  it('keeps a birthday in Adar of a plain year in Adar II of a leap year', () => {
    const next = nextHebrewBirthday('2025-03-15', false, '2026-10-11');
    expect(next).toBe('2027-03-24');
    expect(formatHebrewDate(next ?? '', false)).toBe('ט״ו באדר ב׳');
  });

  it('moves the 30th of a month that has 29 days this year to the 1st of the next', () => {
    expect(formatHebrewDate('2022-11-24', false)).toBe('ל׳ בחשוון');
    // Heshvan 5784 had 29 days; Heshvan 5785 had 30.
    expect(nextHebrewBirthday('2022-11-24', false, '2023-06-01')).toBe('2023-11-14');
    expect(formatHebrewDate('2023-11-14', false)).toBe('א׳ בכסלו');
    expect(nextHebrewBirthday('2022-11-24', false, '2024-06-01')).toBe('2024-12-01');
  });
});

describe('ageInYears and daysBetween', () => {
  it('counts whole years, before and after the birthday', () => {
    expect(ageInYears('2016-10-03', '2026-10-11')).toBe(10);
    expect(ageInYears('2016-10-12', '2026-10-11')).toBe(9);
  });

  it('counts days across months', () => {
    expect(daysBetween('2026-10-11', '2026-11-01')).toBe(21);
  });
});

describe('isoFromHebrew', () => {
  it('turns a Hebrew date into its day, and back', () => {
    // כ״ו באייר תשפ״ז
    const day = isoFromHebrew(5787, 'Iyar', 26);
    expect(day).not.toBeNull();
    expect(formatHebrewDate(day ?? '', true)).toBe('כ״ו באייר תשפ״ז');
    expect(isoFromHebrew(5787, 'Tishri', 1)).toBe('2026-09-12');
  });

  it('lists the months of a year, with two Adars in a leap year', () => {
    expect(hebrewMonths(5786).map((month) => month.month)).toContain('Adar');
    expect(isHebrewLeapYear(5786)).toBe(false);
    expect(isHebrewLeapYear(5787)).toBe(true);
    expect(isHebrewLeapYear(5784)).toBe(true);
    expect(hebrewMonths(5784)).toHaveLength(13);
  });

  it('takes plain Adar as Adar II in a leap year, and a missing 30th as the last day', () => {
    expect(isoFromHebrew(5784, 'Adar', 14)).toBe(isoFromHebrew(5784, 'Adar II', 14));
    const heshvan = hebrewMonths(5786).find((month) => month.month === 'Heshvan');
    const days = heshvan?.days ?? 0;
    expect(isoFromHebrew(5786, 'Heshvan', 30)).toBe(isoFromHebrew(5786, 'Heshvan', days));
    expect(isoFromHebrew(5786, 'Adar II', 14)).toBe(isoFromHebrew(5786, 'Adar', 14));
  });
});
