import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { conversionChanges, conversionTargets, needsAppointmentTime } from '../../lib/conversions';
import { shoppingCategories, todayIso } from '../../lib/itemRules';
import type {
  ConvertibleKind,
  Conversion,
  DebtDirection,
  Item,
  ItemReminder,
  ItemRepeat,
  ShoppingCategory,
} from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { DateField } from '../ui/DateField';
import { OptionGroup } from '../ui/OptionGroup';
import { Segmented } from '../ui/Segmented';
import { SettingRow } from '../ui/SettingRow';
import { SettingsCard } from '../ui/SettingsCard';
import { TextField } from '../ui/TextField';
import { TimeField } from '../ui/TimeField';

type ConvertPanelProps = {
  readonly item: Item;
  readonly kind: ConvertibleKind;
  /** Whether the item has steps or questions under it. */
  readonly hasSteps: boolean;
  /** Whether the item kept debt details from a time it was a debt. */
  readonly hasDebtDetails: boolean;
  readonly repeat: ItemRepeat | null;
  readonly reminders: readonly ItemReminder[];
  readonly onConvert: (conversion: Conversion) => void;
};

const directions = [
  { value: 'owed_to_us', label: labels.debtDirection.owed_to_us },
  { value: 'we_owe', label: labels.debtDirection.we_owe },
] as const satisfies readonly { value: DebtDirection; label: string }[];

function isContainer(kind: ConvertibleKind): boolean {
  return kind === 'goal' || kind === 'issue';
}

/**
 * Converts the item to another kind. Choosing a kind shows what will change and asks for what
 * the new kind can not do without; nothing changes until it is confirmed.
 */
export function ConvertPanel({
  item,
  kind,
  hasSteps,
  hasDebtDetails,
  repeat,
  reminders,
  onConvert,
}: ConvertPanelProps): ReactElement {
  const [target, setTarget] = useState<ConvertibleKind | null>(null);
  const [category, setCategory] = useState<ShoppingCategory>(item.shopping_category ?? 'planned');
  const [counterparty, setCounterparty] = useState(item.title);
  const [amountText, setAmountText] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('owed_to_us');
  const [detach, setDetach] = useState<'hide' | 'detach'>('hide');
  const [day, setDay] = useState(item.due_date ?? todayIso());
  const [hour, setHour] = useState(item.due_time?.slice(0, 5) ?? '');

  const asksSteps = target !== null && isContainer(kind) && !isContainer(target) && hasSteps;
  const asksDebt = target === 'debt' && !hasDebtDetails;
  const asksTime = target !== null && needsAppointmentTime(item, target);
  const amount = Number(amountText);
  const valid =
    (!asksDebt || (counterparty.trim() !== '' && Number.isFinite(amount) && amount > 0)) &&
    (!asksTime || (day !== '' && hour !== ''));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {conversionTargets(kind).map((option) => (
          <Chip
            key={option}
            label={labels.kind[option]}
            selected={option === target}
            onClick={() => {
              setTarget(option === target ? null : option);
            }}
          />
        ))}
      </div>

      {target !== null && (
        <SettingsCard
          actions={
            <>
              <Button
                disabled={!valid}
                onClick={() => {
                  onConvert({
                    kind: target,
                    detachSteps: asksSteps && detach === 'detach',
                    category: target === 'missing_item' ? category : null,
                    debt: asksDebt
                      ? { counterparty: counterparty.trim(), amount, direction }
                      : null,
                    startsAt: asksTime ? `${day}T${hour}` : null,
                  });
                }}
              >
                {labels.convert.convertTo}
                {labels.kind[target]}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setTarget(null);
                }}
              >
                {labels.actions.cancel}
              </Button>
            </>
          }
        >
          <ul className="flex flex-col gap-0.5 text-[13px] text-muted">
            {[...conversionChanges(item, target, repeat, reminders), labels.convert.hint].map(
              (line) => (
                <li key={line}>{line}</li>
              ),
            )}
          </ul>

          {asksTime && (
            <SettingRow label={labels.convert.whenStarts}>
              <DateField label={labels.picker.pickDate} value={day} shortcuts onChange={setDay} />
              <TimeField label={labels.picker.pickHour} value={hour} onChange={setHour} />
            </SettingRow>
          )}

          {asksSteps && (
            <SettingRow label={labels.convert.stepsQuestion}>
              <OptionGroup
                label={labels.convert.stepsQuestion}
                options={[
                  { value: 'hide', label: labels.convert.stepsHide },
                  { value: 'detach', label: labels.convert.stepsDetach },
                ]}
                value={detach}
                onChange={setDetach}
              />
            </SettingRow>
          )}

          {target === 'missing_item' && (
            <div className="flex flex-wrap gap-2">
              {shoppingCategories.map((option) => (
                <Chip
                  key={option}
                  label={labels.shoppingCategory[option]}
                  selected={option === category}
                  outline
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
        </SettingsCard>
      )}
    </div>
  );
}
