import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { shoppingCategories } from '../../lib/itemRules';
import type {
  ConvertibleKind,
  Conversion,
  DebtDirection,
  Item,
  ShoppingCategory,
} from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';

type ConvertPanelProps = {
  readonly item: Item;
  readonly kind: ConvertibleKind;
  /** Whether the item has steps or questions under it. */
  readonly hasSteps: boolean;
  /** Whether the item kept debt details from a time it was a debt. */
  readonly hasDebtDetails: boolean;
  readonly onConvert: (conversion: Conversion) => void;
};

const targets = [
  'task',
  'goal',
  'issue',
  'note',
  'tracker',
  'debt',
  'missing_item',
] as const satisfies readonly ConvertibleKind[];

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const satisfies readonly { value: DebtDirection; label: string }[];

function isContainer(kind: ConvertibleKind): boolean {
  return kind === 'goal' || kind === 'issue';
}

/**
 * Converts the item to another kind. Most kinds convert in one tap; the panel asks first
 * only for what the new kind cannot do without: what to do with steps, the kind of a
 * missing item, or the details of a new debt.
 */
export function ConvertPanel({
  item,
  kind,
  hasSteps,
  hasDebtDetails,
  onConvert,
}: ConvertPanelProps): ReactElement {
  const [target, setTarget] = useState<ConvertibleKind | null>(null);
  const [category, setCategory] = useState<ShoppingCategory>(
    item.shopping_category ?? 'planned',
  );
  const [counterparty, setCounterparty] = useState(item.title);
  const [amountText, setAmountText] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('owed_to_us');

  const asksSteps = target !== null && isContainer(kind) && !isContainer(target) && hasSteps;
  const asksCategory = target === 'missing_item';
  const asksDebt = target === 'debt' && !hasDebtDetails;
  const amount = Number(amountText);
  const debtValid = counterparty.trim() !== '' && Number.isFinite(amount) && amount > 0;

  function convert(chosen: ConvertibleKind, detachSteps: boolean): void {
    onConvert({
      kind: chosen,
      detachSteps,
      category: chosen === 'missing_item' ? category : null,
      debt:
        chosen === 'debt' && !hasDebtDetails
          ? { counterparty: counterparty.trim(), amount, direction }
          : null,
    });
  }

  function pick(chosen: ConvertibleKind): void {
    const needsMore =
      (isContainer(kind) && !isContainer(chosen) && hasSteps) ||
      chosen === 'missing_item' ||
      (chosen === 'debt' && !hasDebtDetails);
    if (needsMore) {
      setTarget(chosen === target ? null : chosen);
    } else {
      convert(chosen, false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {targets
          .filter((option) => option !== kind)
          .map((option) => (
            <Chip
              key={option}
              label={labels.kind[option]}
              selected={option === target}
              onClick={() => {
                pick(option);
              }}
            />
          ))}
      </div>

      {asksCategory && (
        <div className="flex flex-wrap gap-2">
          {shoppingCategories.map((option) => (
            <Chip
              key={option}
              label={labels.shoppingCategory[option]}
              selected={option === category}
              onClick={() => {
                setCategory(option);
              }}
            />
          ))}
        </div>
      )}

      {asksDebt && (
        <div className="flex flex-col gap-3">
          <Segmented options={directions} value={direction} onChange={setDirection} />
          <div className="flex gap-2">
            <TextField
              label={labels.fields.counterparty}
              value={counterparty}
              onChange={setCounterparty}
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
        </div>
      )}

      {target !== null && asksSteps && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{labels.convert.stepsQuestion}</p>
          <Button
            variant="soft"
            disabled={asksDebt && !debtValid}
            onClick={() => {
              convert(target, false);
            }}
          >
            {labels.convert.hideSteps}
          </Button>
          <Button
            variant="ghost"
            disabled={asksDebt && !debtValid}
            onClick={() => {
              convert(target, true);
            }}
          >
            {labels.convert.detachSteps}
          </Button>
        </div>
      )}

      {target !== null && !asksSteps && (
        <Button
          variant="soft"
          disabled={asksDebt && !debtValid}
          onClick={() => {
            convert(target, false);
          }}
        >
          {labels.convert.convertTo} {labels.kind[target]}
        </Button>
      )}

      <p className="text-sm text-muted">{labels.convert.hint}</p>
    </div>
  );
}
