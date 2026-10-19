import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { entryNumber } from '../../lib/trackers';
import { Button } from '../ui/Button';
import { Stepper } from '../ui/Stepper';
import { TextField } from '../ui/TextField';

type DebtPlanFormProps = {
  /** The plan as it is, to change; null to set one up. */
  readonly amount: number | null;
  readonly day: number | null;
  readonly onSave: (amount: number, day: number) => void;
  readonly onCancel: () => void;
};

/** A monthly plan: the sum due each month, and its day (1 to 28, so every month has it). */
export function DebtPlanForm({ amount, day, onSave, onCancel }: DebtPlanFormProps): ReactElement {
  const [amountText, setAmountText] = useState(amount === null ? '' : String(amount));
  const [planDay, setPlanDay] = useState(day ?? 10);
  const parsed = entryNumber(amountText) ?? Number.NaN;
  const valid = Number.isFinite(parsed) && parsed > 0;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (valid) {
      onSave(parsed, planDay);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-paper p-3">
      <TextField
        label={labels.debts.planAmount}
        value={amountText}
        onChange={setAmountText}
        type="number"
        compact
        autoFocus
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] text-muted">{labels.debts.planDay}</span>
        <Stepper value={planDay} min={1} max={28} onChange={setPlanDay} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid}>
          {labels.actions.save}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {labels.actions.cancel}
        </Button>
      </div>
    </form>
  );
}
