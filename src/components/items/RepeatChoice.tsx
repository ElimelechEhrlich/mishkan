import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';
import { Button } from '../ui/Button';
import { ChoiceGrid } from '../ui/ChoiceGrid';
import { SettingsCard } from '../ui/SettingsCard';
import { RepeatEditor } from './RepeatEditor';
import type { RepeatControls } from './TimePicker';

type RepeatChoiceProps = {
  readonly item: Item;
  readonly repeat: RepeatControls;
  /** Makes the item stop being a repeating one (an appointment keeps its day and hour). */
  readonly onNoRepeat: () => void;
  readonly onDone: () => void;
};

/**
 * Whether an appointment, a tracker or a missing item repeats, and how. The choice is the main
 * level; the settings open below it, as in the time of a task.
 */
export function RepeatChoice({
  item,
  repeat,
  onNoRepeat,
  onDone,
}: RepeatChoiceProps): ReactElement {
  const repeating = item.time_mode === 'recurring';
  const [choice, setChoice] = useState<'no' | 'yes'>(repeating ? 'yes' : 'no');
  const open = choice === 'yes';

  return (
    <div className="flex flex-col gap-3">
      <ChoiceGrid
        columns={2}
        options={[
          { value: 'no', label: labels.repeat.noRepeat },
          { value: 'yes', label: labels.repeat.repeats },
        ]}
        value={choice}
        onChange={setChoice}
      />
      {choice === 'no' && repeating && (
        <SettingsCard
          actions={
            <>
              <Button
                onClick={() => {
                  onNoRepeat();
                  onDone();
                }}
              >
                {labels.actions.save}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setChoice('yes');
                }}
              >
                {labels.actions.cancel}
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-muted">{labels.repeat.noRepeatHint}</p>
        </SettingsCard>
      )}
      {open && (
        <RepeatEditor
          item={item}
          repeat={repeat.repeat}
          gone={repeat.gone}
          onSave={(draft) => {
            repeat.onSave(draft);
            onDone();
          }}
          onCancel={() => {
            setChoice(repeating ? 'yes' : 'no');
            onDone();
          }}
          onStop={() => {
            repeat.onStop();
            onDone();
          }}
          onResume={(end) => {
            repeat.onResume(end);
            onDone();
          }}
        />
      )}
    </div>
  );
}
