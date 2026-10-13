import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { DebtDirection } from '../../types/domain';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';

type DebtFieldsProps = {
  readonly direction: DebtDirection;
  readonly onDirectionChange: (direction: DebtDirection) => void;
  readonly amount: string;
  readonly onAmountChange: (amount: string) => void;
};

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const satisfies readonly { value: DebtDirection; label: string }[];

/** The parts of a new debt besides who and where: which way, and how much. */
export function DebtFields({
  direction,
  onDirectionChange,
  amount,
  onAmountChange,
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
    </div>
  );
}
