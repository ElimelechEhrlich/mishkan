import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { entryNumber } from '../../lib/trackers';
import type { DebtChanges, DebtDetails, DebtDirection } from '../../types/domain';
import { Card } from '../ui/Card';
import { InlineEdit } from '../ui/InlineEdit';
import { Segmented } from '../ui/Segmented';

type DebtCardProps = {
  readonly debt: DebtDetails;
  readonly onChange: (changes: DebtChanges) => void;
};

const importance = [
  { value: 'important', label: labels.debts.important },
  { value: 'canWait', label: labels.debts.canWait },
] as const;

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const;

/** A debt on its page: which way it goes, how much, and how important; all open to change. */
export function DebtCard({ debt, onChange }: DebtCardProps): ReactElement {
  // The way chosen shows at once, until the saved debt comes back (a new copy of it).
  const [chosen, setChosen] = useState<{
    readonly of: DebtDetails;
    readonly direction: DebtDirection;
  } | null>(null);
  const direction = chosen !== null && chosen.of === debt ? chosen.direction : debt.direction;
  const [important, setImportant] = useState<{
    readonly of: DebtDetails;
    readonly important: boolean;
  } | null>(null);
  const isImportant =
    important !== null && important.of === debt ? important.important : debt.important;
  return (
    <Card title={labels.sections.debt}>
      <div className="flex flex-col gap-3">
        <Segmented
          options={directions}
          value={direction}
          onChange={(next) => {
            setChosen({ of: debt, direction: next });
            onChange({ direction: next });
          }}
        />
        <Segmented
          compact
          options={importance}
          value={isImportant ? 'important' : 'canWait'}
          onChange={(next) => {
            setImportant({ of: debt, important: next === 'important' });
            onChange({ important: next === 'important' });
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{labels.fields.amount}</span>
          <InlineEdit
            value={String(debt.amount)}
            textClass="font-display text-2xl font-bold"
            onSave={(text) => {
              // "1,200" is twelve hundred, and "₪500" is 500, as everywhere else in the app.
              const amount = entryNumber(text) ?? Number.NaN;
              // Anything that is not a positive amount is left as it was.
              if (Number.isFinite(amount) && amount > 0) {
                onChange({ amount });
              }
            }}
          />
        </div>
      </div>
    </Card>
  );
}
