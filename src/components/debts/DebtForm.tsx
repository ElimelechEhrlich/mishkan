import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { DebtDirection, NewDebt } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';

type DebtFormProps = {
  /** The domain new debts are filed under, or null to leave them for later. */
  readonly domainId: string | null;
  readonly onAdd: (newDebt: NewDebt) => Promise<boolean>;
};

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const satisfies readonly { value: DebtDirection; label: string }[];

/** A "new debt" button that unfolds into: who, how much, and in which direction. */
export function DebtForm({ domainId, onAdd }: DebtFormProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<DebtDirection>('owed_to_us');
  const [counterparty, setCounterparty] = useState('');
  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);

  const name = counterparty.trim();
  const amount = Number(amountText);
  const valid = name !== '' && Number.isFinite(amount) && amount > 0;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    void onAdd({ counterparty: name, amount, direction, domainId }).then((saved) => {
      setSaving(false);
      if (saved) {
        setCounterparty('');
        setAmountText('');
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button
        variant="soft"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" />
        {labels.actions.newDebt}
      </Button>
    );
  }

  return (
    <Card
      title={labels.actions.newDebt}
      aside={
        <IconButton
          icon="close"
          label={labels.actions.close}
          onClick={() => {
            setOpen(false);
          }}
        />
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Segmented options={directions} value={direction} onChange={setDirection} />
        <div className="flex gap-2">
          <TextField
            label={labels.fields.counterparty}
            value={counterparty}
            onChange={setCounterparty}
            autoFocus
            compact
          />
          <TextField
            label={labels.fields.amount}
            type="number"
            direction="ltr"
            value={amountText}
            onChange={setAmountText}
            compact
          />
        </div>
        <Button type="submit" disabled={!valid || saving}>
          {labels.actions.add}
        </Button>
      </form>
    </Card>
  );
}
