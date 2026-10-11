import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { quickTimeChoice, todayIso } from '../../lib/itemRules';
import { debtHolders, shoppingTargets } from '../../lib/lookups';
import type {
  ConvertibleKind,
  DebtDirection,
  EntityWithDomains,
  NewDebt,
  NewItem,
  NewMissingItem,
  QuickTime,
  ShoppingCategory,
} from '../../types/domain';
import { MissingItemFields } from '../shopping/MissingItemFields';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { DebtFields } from './DebtFields';
import { useQuickStructure } from '../../hooks/useQuickStructure';
import { ErrorBanner } from '../ui/ErrorBanner';
import { DomainPicker } from './DomainPicker';
import { QuickTimePicker } from './QuickTimePicker';

type QuickAddSheetProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly onAdd: (newItem: NewItem) => Promise<boolean>;
  readonly onAddMissingItem: (newItem: NewMissingItem) => Promise<boolean>;
  readonly onAddDebt: (newDebt: NewDebt) => Promise<boolean>;
  /** Reloads the entities after a child or a domain is added from the sheet. */
  readonly onStructureChanged: () => Promise<void>;
  /** The kind that is selected when the sheet opens. */
  readonly defaultKind?: ConvertibleKind;
  /** Opens the sheet right away, for the "new item" home-screen shortcut. */
  readonly initiallyOpen?: boolean;
  /** The chosen entity: the item is for it unless changed. */
  readonly entityId?: string | undefined;
  /** Opens on this domain; a shopping domain opens as a missing item for its entity. */
  readonly initialDomainId?: string | undefined;
};

const kinds = [
  'task',
  'goal',
  'issue',
  'note',
  'debt',
  'missing_item',
] as const satisfies readonly ConvertibleKind[];

/**
 * The floating add button and the sheet it opens. The fields follow the kind:
 * a domain and when for tasks and goals, a domain for issues and notes, direction,
 * amount and holder for a debt, and kind and whom for a missing item.
 * Only the title is required, except where the kind cannot be saved without more.
 */
export function QuickAddSheet({
  entities,
  onAdd,
  onAddMissingItem,
  onAddDebt,
  onStructureChanged,
  defaultKind = 'task',
  initiallyOpen = false,
  entityId,
  initialDomainId,
}: QuickAddSheetProps): ReactElement {
  const initialIsShopping = entities.some((entity) =>
    entity.domains.some((domain) => domain.id === initialDomainId && domain.role === 'shopping'),
  );
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ConvertibleKind>(
    initialIsShopping ? 'missing_item' : defaultKind,
  );
  const [domainId, setDomainId] = useState<string | null>(
    initialIsShopping ? null : (initialDomainId ?? null),
  );
  const [quickTime, setQuickTime] = useState<QuickTime | null>(null);
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [shoppingDomainId, setShoppingDomainId] = useState<string | null>(
    initialIsShopping ? (initialDomainId ?? null) : null,
  );
  const [direction, setDirection] = useState<DebtDirection>('owed_to_us');
  const [amountText, setAmountText] = useState('');
  const [debtDomainId, setDebtDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Bumped after each save so the picker starts again from the list of entities. */
  const [pickerVersion, setPickerVersion] = useState(0);

  const structure = useQuickStructure(entities, onStructureChanged);
  const trimmedTitle = title.trim();

  const targets = shoppingTargets(entities);
  const missingItemDomainId =
    shoppingDomainId ??
    targets.find((target) => target.entity.id === entityId)?.domainId ??
    targets[0]?.domainId ??
    null;

  const holders = debtHolders(entities);
  const chosenDebtDomainId =
    debtDomainId ??
    holders.find((holder) => holder.entity.id === entityId)?.domainId ??
    holders[0]?.domainId ??
    null;
  const amount = Number(amountText);
  const amountValid = Number.isFinite(amount) && amount > 0;

  const asksTime = kind === 'task' || kind === 'goal';
  const canSave =
    trimmedTitle !== '' &&
    !saving &&
    (kind !== 'missing_item' || missingItemDomainId !== null) &&
    (kind !== 'debt' || amountValid);

  /**
   * Choosing an entity's shopping domain means something to buy: the item becomes
   * a missing item for that entity, so it shows on the shopping list.
   */
  function pickDomain(chosen: string | null): void {
    const isShoppingDomain = entities.some((entity) =>
      entity.domains.some((domain) => domain.id === chosen && domain.role === 'shopping'),
    );
    if (chosen !== null && isShoppingDomain) {
      setKind('missing_item');
      setShoppingDomainId(chosen);
      return;
    }
    setDomainId(chosen);
  }

  function save(): Promise<boolean> {
    if (kind === 'missing_item') {
      return missingItemDomainId === null
        ? Promise.resolve(false)
        : onAddMissingItem({ title: trimmedTitle, category, domainId: missingItemDomainId });
    }
    if (kind === 'debt') {
      return onAddDebt({
        counterparty: trimmedTitle,
        amount,
        direction,
        domainId: chosenDebtDomainId,
      });
    }
    return onAdd({
      title: trimmedTitle,
      kind,
      domainId,
      parentId: null,
      time: asksTime && quickTime !== null ? quickTimeChoice(quickTime, todayIso()) : null,
    });
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    setSaving(true);
    void save().then((saved) => {
      setSaving(false);
      if (saved) {
        setTitle('');
        setDomainId(null);
        setQuickTime(null);
        setAmountText('');
        setPickerVersion((version) => version + 1);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label={labels.actions.newItem}
        onClick={() => {
          setOpen(true);
        }}
        className="fixed end-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-float transition active:scale-95"
      >
        <Icon name="plus" className="size-7" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-20 flex animate-fade-in flex-col justify-end bg-ink/30 backdrop-blur-[2px]"
      onClick={() => {
        setOpen(false);
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="mx-auto flex max-h-[90dvh] w-full max-w-xl animate-sheet-up flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-sheet"
      >
        <div className="flex flex-col gap-3 border-b border-line px-4 pt-2.5 pb-3">
          <span className="mx-auto h-1 w-9 shrink-0 rounded-full bg-line" />
          <div className="flex items-center justify-between">
            <IconButton
              icon="close"
              label={labels.actions.close}
              onClick={() => {
                setOpen(false);
              }}
            />
            <h2 className="font-display text-[17px] font-semibold">{labels.actions.newItem}</h2>
            <span className="size-10" />
          </div>
          <label className="sr-only" htmlFor="quick-add-title">
            {labels.titlePrompt[kind]}
          </label>
          <input
            id="quick-add-title"
            value={title}
            autoFocus
            autoComplete="off"
            placeholder={labels.titlePrompt[kind]}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className="w-full bg-transparent px-1 py-1 text-xl font-medium placeholder:text-faint focus:outline-none focus-visible:outline-none"
          />
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-wide text-muted">{labels.capture.kind}</span>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
              {kinds.map((option) => (
                <span key={option} className="shrink-0">
                  <Chip
                    label={labels.kind[option]}
                    selected={option === kind}
                    onClick={() => {
                      setKind(option);
                    }}
                  />
                </span>
              ))}
            </div>
          </div>

          {kind === 'missing_item' && (
            <MissingItemFields
              category={category}
              onCategoryChange={setCategory}
              targets={targets}
              domainId={missingItemDomainId}
              onDomainChange={setShoppingDomainId}
            />
          )}

          {kind === 'debt' && (
            <DebtFields
              direction={direction}
              onDirectionChange={setDirection}
              amount={amountText}
              onAmountChange={setAmountText}
              holders={holders}
              domainId={chosenDebtDomainId}
              onDomainChange={setDebtDomainId}
            />
          )}

          {kind !== 'missing_item' && kind !== 'debt' && (
            <div className="flex flex-col gap-3">
              <DomainPicker
                key={pickerVersion}
                entities={entities}
                value={domainId}
                onChange={pickDomain}
                initialEntityId={entityId}
                onAddDomain={structure.addDomain}
                onAddChild={structure.addChild}
              />
              <ErrorBanner message={structure.error} />
              {domainId === null && (
                <p className="text-[13px] text-muted">{labels.capture.noDomainHint}</p>
              )}
            </div>
          )}

          {asksTime && <QuickTimePicker value={quickTime} onChange={setQuickTime} />}
        </div>
        <div className="border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-col">
            <Button type="submit" disabled={!canSave}>
              {labels.actions.save}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
