import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { DebtDirection, EntityWithDomains } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';

type DebtFieldsProps = {
  readonly direction: DebtDirection;
  readonly onDirectionChange: (direction: DebtDirection) => void;
  readonly amount: string;
  readonly onAmountChange: (amount: string) => void;
  /** Entities that hold a debts domain, with that domain's id. */
  readonly holders: readonly { readonly entity: EntityWithDomains; readonly domainId: string }[];
  readonly domainId: string | null;
  readonly onDomainChange: (domainId: string) => void;
};

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const satisfies readonly { value: DebtDirection; label: string }[];

/** The parts of a new debt besides who: which way, how much, and whose debts it belongs to. */
export function DebtFields({
  direction,
  onDirectionChange,
  amount,
  onAmountChange,
  holders,
  domainId,
  onDomainChange,
}: DebtFieldsProps): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <Segmented options={directions} value={direction} onChange={onDirectionChange} />
      <TextField
        label={labels.fields.amount}
        type="number"
        direction="ltr"
        value={amount}
        onChange={onAmountChange}
      />
      {holders.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-wide text-muted">
            {labels.capture.debtOf}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {holders.map((holder) => (
              <Chip
                key={holder.domainId}
                label={holder.entity.name}
                note={holder.entity.kind === 'personal' ? labels.capture.privateMark : undefined}
                selected={holder.domainId === domainId}
                onClick={() => {
                  onDomainChange(holder.domainId);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
