import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { DebtDetails, DebtDirection } from '../../types/domain';
import { Card } from '../ui/Card';
import { InlineEdit } from '../ui/InlineEdit';
import { Segmented } from '../ui/Segmented';

type DebtCardProps = {
  readonly debt: DebtDetails;
  readonly onChange: (changes: { amount?: number; direction?: DebtDirection }) => void;
};

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const;

/** A debt on its page: which way it goes, and how much, both open to change. */
export function DebtCard({ debt, onChange }: DebtCardProps): ReactElement {
  return (
    <Card title={labels.sections.debt}>
      <div className="flex flex-col gap-3">
        <Segmented
          options={directions}
          value={debt.direction}
          onChange={(direction) => {
            onChange({ direction });
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{labels.fields.amount}</span>
          <InlineEdit
            value={String(debt.amount)}
            textClass="font-display text-2xl font-bold"
            onSave={(text) => {
              const amount = Number(text.replace(',', '.'));
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
