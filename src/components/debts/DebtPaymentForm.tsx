import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { todayIso } from '../../lib/itemRules';
import { entryNumber } from '../../lib/trackers';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { TextField } from '../ui/TextField';

type DebtPaymentFormProps = {
  readonly onAdd: (amount: number, paidOn: string, note: string | null) => void;
  readonly onCancel: () => void;
};

/** A payment of a debt: how much, on which day (today at first), and a note if wanted. */
export function DebtPaymentForm({ onAdd, onCancel }: DebtPaymentFormProps): ReactElement {
  const [amountText, setAmountText] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [note, setNote] = useState('');
  const amount = entryNumber(amountText) ?? Number.NaN;
  const valid = Number.isFinite(amount) && amount > 0;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (valid) {
      onAdd(amount, paidOn, note.trim() === '' ? null : note.trim());
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
