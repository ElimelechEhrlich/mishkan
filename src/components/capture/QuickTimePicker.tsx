import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { QuickTime } from '../../types/domain';
import { Chip } from '../ui/Chip';

type QuickTimePickerProps = {
  readonly value: QuickTime | null;
  readonly onChange: (value: QuickTime | null) => void;
};

const options = ['today', 'tomorrow', 'anytime', 'someday'] as const satisfies readonly QuickTime[];

/** When a new task or goal is for, in one tap. Tapping the chosen one again clears it. */
export function QuickTimePicker({ value, onChange }: QuickTimePickerProps): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold tracking-wide text-muted">{labels.capture.when}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
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
      {value === null && <p className="text-[13px] text-muted">{labels.capture.noTimeHint}</p>}
    </div>
  );
}
