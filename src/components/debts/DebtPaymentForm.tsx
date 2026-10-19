import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { todayIso } from '../../lib/itemRules';
import { entryNumber } from '../../lib/trackers';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { DateField } from '../ui/DateField';
import { TextField } from '../ui/TextField';

type DebtPaymentFormProps = {
  /** The open months of the plan it may be for, each with its name; empty without a plan. */
  readonly months: readonly { readonly month: string; readonly label: string }[];
  /** The month it is for at first: the one now due. */
  readonly dueMonth: string | null;
  readonly onAdd: (
    amount: number,
    paidOn: string,
    note: string | null,
    forMonth: string | null,
  ) => void;
  readonly onCancel: () => void;
};

/**
 * A payment of a debt: how much, on which day (today at first), and a note if wanted. With a
 * plan, the month it is for (the one due, at first), or none.
 */
export function DebtPaymentForm({
  months,
  dueMonth,
  onAdd,
  onCancel,
}: DebtPaymentFormProps): ReactElement {
  const [amountText, setAmountText] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [note, setNote] = useState('');
  const [forMonth, setForMonth] = useState(dueMonth);
  const amount = entryNumber(amountText) ?? Number.NaN;
  const valid = Number.isFinite(amount) && amount > 0;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (valid) {
      onAdd(amount, paidOn, note.trim() === '' ? null : note.trim(), forMonth);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-paper p-3">
      <div className="flex gap-2">
        <TextField
          label={labels.debts.paymentAmount}
          value={amountText}
          onChange={setAmountText}
          type="number"
          compact
          autoFocus
        />
        <DateField label={labels.debts.paymentDay} value={paidOn} onChange={setPaidOn} />
      </div>
      {months.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] text-muted">{labels.debts.towardMonth}</span>
          {months.map((option) => (
            <Chip
              key={option.month}
              label={option.label}
              selected={forMonth === option.month}
              outline
              onClick={() => {
                setForMonth(option.month);
              }}
            />
          ))}
          <Chip
            label={labels.debts.noMonth}
            selected={forMonth === null}
            outline
            onClick={() => {
              setForMonth(null);
            }}
          />
        </div>
      )}
      <TextField label={labels.debts.paymentNote} value={note} onChange={setNote} compact />
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
