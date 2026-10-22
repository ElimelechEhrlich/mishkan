import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { hebrewMonthChoices, hebrewNumeral, hebrewYearlyOf } from '../../lib/hebrewDate';
import type { HebrewYearly } from '../../types/domain';
import { DateField } from '../ui/DateField';
import { OptionGroup } from '../ui/OptionGroup';

type HebrewYearlyFieldsProps = {
  readonly value: HebrewYearly;
  readonly onChange: (value: HebrewYearly) => void;
};

const select =
  'min-h-11 rounded-xl border border-line bg-surface px-2 text-[15px] focus:border-primary focus:outline-none';

/**
 * A date kept every Hebrew year: its day and month, for Adar of a plain year which Adar in a
 * leap year, or worked out from a civil day (after sunset, the next), such as a day of death.
 */
export function HebrewYearlyFields({ value, onChange }: HebrewYearlyFieldsProps): ReactElement {
  const [fromDay, setFromDay] = useState('');
  const [afterSunset, setAfterSunset] = useState(false);

  function pickDay(day: string, sunset: boolean): void {
    setFromDay(day);
    setAfterSunset(sunset);
    if (day !== '') {
      onChange({ ...hebrewYearlyOf(day, sunset), leapAdar: value.leapAdar });
    }
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex gap-2">
        <select
          aria-label={labels.picker.hebrewDay}
          value={value.day}
          onChange={(event) => {
            onChange({ ...value, day: Number(event.target.value) });
          }}
          className={select}
        >
          {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
            <option key={day} value={day}>
              {hebrewNumeral(day)}
            </option>
          ))}
        </select>
        <select
          aria-label={labels.picker.hebrewMonth}
          value={value.month}
          onChange={(event) => {
            onChange({ ...value, month: event.target.value });
          }}
          className={`${select} flex-1`}
        >
          {hebrewMonthChoices.map((choice) => (
            <option key={choice.month} value={choice.month}>
              {choice.name}
            </option>
          ))}
        </select>
      </div>
      {value.month === 'Adar' && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">{labels.hebrewRepeat.leapAdar}</span>
          <OptionGroup
            label={labels.hebrewRepeat.leapAdar}
            options={[
              { value: 'Adar I', label: labels.hebrewRepeat.adarI },
              { value: 'Adar II', label: labels.hebrewRepeat.adarII },
            ]}
            value={value.leapAdar}
            onChange={(leapAdar) => {
              onChange({ ...value, leapAdar });
            }}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5 rounded-xl bg-paper p-2.5">
        <span className="text-[13px] text-muted">{labels.hebrewRepeat.fromDay}</span>
        <DateField
          label={labels.hebrewRepeat.fromDay}
          hebrew={false}
          value={fromDay}
          onChange={(day) => {
            pickDay(day, afterSunset);
          }}
        />
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={afterSunset}
            onChange={(event) => {
              pickDay(fromDay, event.target.checked);
            }}
            className="size-4.5 accent-primary"
          />
          {labels.hebrewRepeat.afterSunset}
        </label>
      </div>
      <p className="text-[12px] text-muted">{labels.hebrewRepeat.hint}</p>
    </div>
  );
}
