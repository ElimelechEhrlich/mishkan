import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { hebrewDateOf, hebrewMonths, hebrewNumeral, isoFromHebrew } from '../../lib/hebrewDate';
import { formatPickedDate, todayIso } from '../../lib/itemRules';
import { Button } from './Button';

type HebrewDatePickerProps = {
  /** The day to start from (YYYY-MM-DD), or '' for today. */
  readonly value: string;
  readonly onPick: (isoDate: string) => void;
};

/** How many Hebrew years back and ahead can be chosen. */
const yearsBack = 110;
const yearsAhead = 10;

const select =
  'min-h-11 rounded-xl border border-line bg-surface px-2 text-[15px] focus:border-primary focus:outline-none';

/**
 * A day chosen by its Hebrew date: day, month and year, the months of that year (two Adars in
 * a leap year), and the civil day it falls on, shown before it is chosen.
 */
export function HebrewDatePicker({ value, onPick }: HebrewDatePickerProps): ReactElement {
  const start = hebrewDateOf(value === '' ? todayIso() : value);
  const thisYear = hebrewDateOf(todayIso()).year;
  const [year, setYear] = useState(start.year);
  const [month, setMonth] = useState(start.month);
  const [day, setDay] = useState(start.day);
  const months = useMemo(() => hebrewMonths(year), [year]);
  // A month the year lacks (Adar I or II, or plain Adar) becomes the one it has.
  const chosenMonth =
    months.find((entry) => entry.month === month) ??
    months.find((entry) => entry.month.startsWith('Adar')) ??
    months[0];
  const days = chosenMonth?.days ?? 30;
  const iso = chosenMonth === undefined ? null : isoFromHebrew(year, chosenMonth.month, day);
  const years = Array.from(
    { length: yearsBack + yearsAhead + 1 },
    (_, index) => thisYear + yearsAhead - index,
  );

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-paper p-3">
      <div className="flex gap-2">
        <select
          aria-label={labels.picker.hebrewDay}
          value={Math.min(day, days)}
          onChange={(event) => {
            setDay(Number(event.target.value));
          }}
          className={select}
        >
          {Array.from({ length: days }, (_, index) => index + 1).map((option) => (
            <option key={option} value={option}>
              {hebrewNumeral(option)}
            </option>
          ))}
        </select>
        <select
          aria-label={labels.picker.hebrewMonth}
          value={chosenMonth?.month ?? ''}
          onChange={(event) => {
            setMonth(event.target.value);
          }}
          className={`${select} flex-1`}
        >
          {months.map((option) => (
            <option key={option.month} value={option.month}>
              {option.name}
            </option>
          ))}
        </select>
        <select
          aria-label={labels.picker.hebrewYear}
          value={year}
          onChange={(event) => {
            setYear(Number(event.target.value));
          }}
          className={select}
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {hebrewNumeral(option)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-[14px] text-muted">
          {iso === null ? '' : formatPickedDate(iso)}
        </span>
        <Button
          variant="soft"
          disabled={iso === null}
          onClick={() => {
            if (iso !== null) {
              onPick(iso);
            }
          }}
        >
          {labels.picker.hebrewChoose}
        </Button>
      </div>
    </div>
  );
}
