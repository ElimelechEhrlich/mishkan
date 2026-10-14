import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { QuickTime } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { SettingRow } from '../ui/SettingRow';
import { SettingsCard } from '../ui/SettingsCard';
import { TimeField } from '../ui/TimeField';

type QuickTimePickerProps = {
  readonly value: QuickTime | null;
  readonly onChange: (value: QuickTime | null) => void;
  /** A goal's date is a target set on its page, so today and tomorrow are not offered. */
  readonly forGoal?: boolean;
  /** An hour on today or tomorrow (HH:MM), or '' for none. */
  readonly hour: string;
  readonly onHourChange: (hour: string) => void;
};

const options = [
  'today',
  'tomorrow',
  'urgent',
  'anytime',
  'someday',
] as const satisfies readonly QuickTime[];

const datedOptions: ReadonlySet<QuickTime> = new Set(['today', 'tomorrow']);

/** When a new task or goal is for, in one tap. Tapping the chosen one again clears it. */
export function QuickTimePicker({
  value,
  onChange,
  forGoal = false,
  hour,
  onHourChange,
}: QuickTimePickerProps): ReactElement {
  const shown = forGoal ? options.filter((option) => !datedOptions.has(option)) : options;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold tracking-wide text-muted">{labels.capture.when}</span>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((option) => (
          <Chip
            key={option}
            label={labels.quickTime[option]}
            selected={option === value}
            onClick={() => {
              onChange(option === value ? null : option);
            }}
          />
        ))}
      </div>
      {value !== null && datedOptions.has(value) && (
        <SettingsCard>
          <SettingRow label={labels.fields.dueTime}>
            <TimeField
              label={labels.picker.pickHour}
              optional
              value={hour}
              onChange={onHourChange}
            />
          </SettingRow>
        </SettingsCard>
      )}
      {value === null && <p className="text-[13px] text-muted">{labels.capture.noTimeHint}</p>}
    </div>
  );
}
