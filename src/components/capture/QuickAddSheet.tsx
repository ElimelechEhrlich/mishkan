import { useKeyboardSpace } from '../../hooks/useKeyboardSpace';
import { useEffect, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { quickTimeChoice, seriesStarts, todayIso } from '../../lib/itemRules';
import { shoppingTargets } from '../../lib/lookups';
import type {
  AddableKind,
  DebtDirection,
  EntityWithDomains,
  NewAppointment,
  NewDebt,
  NewItem,
  NewMissingItem,
  QuickTime,
  ShoppingCategory,
} from '../../types/domain';
import { MissingItemFields } from '../shopping/MissingItemFields';
import { ShoppingListField } from '../shopping/ShoppingListField';
import { shoppingLines } from '../../lib/shoppingLines';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';
import { AppointmentFields, emptyAppointmentDraft } from './AppointmentFields';
import type { AppointmentDraft } from './AppointmentFields';
import { DebtFields } from './DebtFields';
import { DomainPicker } from './DomainPicker';
import { QuickTimePicker } from './QuickTimePicker';

type QuickAddSheetProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly onAdd: (newItem: NewItem) => Promise<boolean>;
  readonly onAddMissingItem: (newItem: NewMissingItem) => Promise<boolean>;
  readonly onAddDebt: (newDebt: NewDebt) => Promise<boolean>;
  readonly onAddAppointments: (appointment: NewAppointment) => Promise<boolean>;
  /** Reloads the entities after a child or a domain is added from the sheet. */
  readonly onStructureChanged: () => Promise<void>;
  /** The kind that is selected when the sheet opens. */
  readonly defaultKind?: AddableKind;
  /** Opens the sheet right away, for the "new item" home-screen shortcut. */
  readonly initiallyOpen?: boolean;
  /** The chosen entity: the item is for it unless changed. */
  readonly entityId?: string | undefined;
  /** Opens on this domain; a shopping domain opens as a missing item for its entity. */
  readonly initialDomainId?: string | undefined;
};

const noteKinds = [
  { value: 'note', label: labels.data.noteKinds.note },
  { value: 'value', label: labels.data.noteKinds.value },
] as const;

const kinds = [
  'task',
  'appointment',
  'goal',
  'issue',
  'note',
  'tracker',
  'debt',
  'missing_item',
] as const satisfies readonly AddableKind[];

/** Empty text is stored as nothing. */
function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

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
  onAddAppointments,
  onStructureChanged,
  defaultKind = 'task',
  initiallyOpen = false,
  entityId,
  initialDomainId,
}: QuickAddSheetProps): ReactElement {
  const initialIsShopping = entities.some((entity) =>
    entity.domains.some((domain) => domain.id === initialDomainId && domain.role === 'shopping'),
  );
  const keyboard = useKeyboardSpace();
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AddableKind>(initialIsShopping ? 'missing_item' : defaultKind);
  /**
   * The entity chosen, at first the one whose page this is. It is kept with the item even
   * when no domain is chosen, so completing it later asks only for the domain.
   */
  const [pickedEntityId, setPickedEntityId] = useState<string | null>(entityId ?? null);
  const [domainId, setDomainId] = useState<string | null>(
    initialIsShopping ? null : (initialDomainId ?? null),
  );
  const [quickTime, setQuickTime] = useState<QuickTime | null>(null);
  const [quickHour, setQuickHour] = useState('');
  /** A note can be one value ("נתון"): a name, which is its title, and a value. */
  const [noteKind, setNoteKind] = useState<'note' | 'value'>('note');
  const [valueText, setValueText] = useState('');
  const isValue = kind === 'note' && noteKind === 'value';
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [shoppingDomainId, setShoppingDomainId] = useState<string | null>(
    initialIsShopping ? (initialDomainId ?? null) : null,
  );
  const [direction, setDirection] = useState<DebtDirection>('owed_to_us');
  const [amountText, setAmountText] = useState('');
  const [appointment, setAppointment] = useState<AppointmentDraft>(emptyAppointmentDraft);
  const [saving, setSaving] = useState(false);
  /** Bumped after each save so the picker starts again from the list of entities. */
  const [pickerVersion, setPickerVersion] = useState(0);

  // While the sheet is open the page behind it stays still; scrolling moves the sheet.
  useEffect(() => {
    if (!open) {
      return;
    }
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return (): void => {
      root.style.overflow = before;
    };
  }, [open]);

  const trimmedTitle = title.trim();
  // A missing item is written as a list, a line per item.
  const listTitles = shoppingLines(title);

  const targets = shoppingTargets(entities);
  const missingItemDomainId =
    shoppingDomainId ??
    targets.find((target) => target.entity.id === entityId)?.domainId ??
    targets[0]?.domainId ??
    null;

  const amount = Number(amountText);
  const amountValid = Number.isFinite(amount) && amount > 0;

  const asksTime = kind === 'task' || kind === 'goal';
  // Today or tomorrow picked for a task does not carry over when the kind becomes a goal.
  const pickedTime =
    kind === 'goal' && (quickTime === 'today' || quickTime === 'tomorrow') ? null : quickTime;
  const healthDomain = entities.some((entity) =>
    entity.domains.some(
      (domain) => domain.id === domainId && domain.name.includes(labels.appointment.healthDomain),
    ),
  );
  const canSave =
    (kind === 'missing_item' ? listTitles.length > 0 : trimmedTitle !== '') &&
    !saving &&
    (kind !== 'appointment' || appointment.startsAt !== '') &&
    (kind !== 'missing_item' || missingItemDomainId !== null) &&
    (kind !== 'debt' || amountValid) &&
    (!isValue || valueText.trim() !== '');

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
        : onAddMissingItem({
            titles: listTitles,
            category,
            domainId: missingItemDomainId,
          });
    }
    if (kind === 'appointment') {
      const placeKind = appointment.placeKind;
      return onAddAppointments({
        title: trimmedTitle,
        domainId,
        startsAt: appointment.startsAt,
        repeat: appointment.repeat,
        count: seriesStarts(appointment.startsAt, appointment.repeat, Number(appointment.count))
          .length,
        placeKind,
        place:
          placeKind === 'in_person' || placeKind === 'phone' ? textOrNull(appointment.place) : null,
        meetingUrl: placeKind === 'video' ? textOrNull(appointment.meetingUrl) : null,
        withWhom: textOrNull(appointment.withWhom),
        entityId: pickedEntityId,
      });
    }
    if (kind === 'debt') {
      return onAddDebt({
        counterparty: trimmedTitle,
        amount,
        direction,
        // Only the domain chosen: without one, the debt waits in needs-completion.
        domainId,
        entityId: pickedEntityId,
      });
    }
    return onAdd({
      title: trimmedTitle,
      kind,
      domainId,
      parentId: null,
      time:
        asksTime && pickedTime !== null
          ? quickTimeChoice(pickedTime, todayIso(), kind === 'task' ? quickHour : '')
          : null,
      ...(isValue ? { value: valueText.trim() } : {}),
      entityId: pickedEntityId,
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
      if (saved && kind === 'missing_item') {
        // The list is in; the field is ready for the next one, of the kind still chosen.
        setTitle('');
        return;
      }
      if (saved) {
        setTitle('');
        setDomainId(null);
        setQuickTime(null);
        setQuickHour('');
        setAmountText('');
        setValueText('');
        setNoteKind('note');
        setAppointment(emptyAppointmentDraft);
        setPickedEntityId(entityId ?? null);
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
          setPickedEntityId(entityId ?? null);
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
      className="fixed inset-0 z-20 flex animate-fade-in flex-col justify-end overscroll-contain bg-ink/30 backdrop-blur-[2px]"
      // Above the keyboard, so the add button stays in sight while typing.
      style={{ paddingBottom: keyboard.covered }}
      onClick={() => {
        setOpen(false);
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={
          keyboard.visible === null
            ? undefined
            : { maxHeight: `${String(Math.round(keyboard.visible * 0.92))}px` }
        }
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
            {/* Also at the top, in sight from the first moment, whatever the keyboard covers. */}
            <button
              type="submit"
              disabled={!canSave}
              className="min-h-10 rounded-xl px-3 text-[15px] font-semibold text-primary transition active:scale-95 disabled:text-faint"
            >
              {kind === 'missing_item' ? labels.capture.addShort : labels.actions.save}
            </button>
          </div>
          <label className="sr-only" htmlFor="quick-add-title">
            {labels.titlePrompt[kind]}
          </label>
          {kind === 'missing_item' ? (
            <ShoppingListField value={title} onChange={setTitle} autoFocus large />
          ) : (
            <input
              id="quick-add-title"
              value={title}
              autoFocus
              autoComplete="off"
              placeholder={isValue ? labels.data.valueName : labels.titlePrompt[kind]}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              className="w-full bg-transparent px-1 py-1 text-xl font-medium placeholder:text-faint focus:outline-none focus-visible:outline-none"
            />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-wide text-muted">
              {labels.capture.kind}
            </span>
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

          {kind === 'note' && (
            <div className="flex flex-col gap-3">
              <Segmented options={noteKinds} value={noteKind} onChange={setNoteKind} />
              {noteKind === 'value' && (
                <TextField
                  label={labels.data.valueField}
                  value={valueText}
                  onChange={setValueText}
                />
              )}
            </div>
          )}

          {kind === 'debt' && (
            <DebtFields
              direction={direction}
              onDirectionChange={setDirection}
              amount={amountText}
              onAmountChange={setAmountText}
            />
          )}

          {kind !== 'missing_item' && (
            <div className="flex flex-col gap-3">
              <DomainPicker
                key={pickerVersion}
                entities={entities}
                value={domainId}
                onChange={pickDomain}
                initialEntityId={entityId}
                onEntityChange={setPickedEntityId}
                onStructureChanged={onStructureChanged}
              />
              {domainId === null && (
                <p className="text-[13px] text-muted">{labels.capture.noDomainHint}</p>
              )}
            </div>
          )}

          {kind === 'appointment' && (
            <AppointmentFields
              draft={appointment}
              health={healthDomain}
              onChange={(changes) => {
                setAppointment((current) => ({ ...current, ...changes }));
              }}
            />
          )}

          {asksTime && (
            <QuickTimePicker
              value={pickedTime}
              onChange={setQuickTime}
              forGoal={kind === 'goal'}
              hour={quickHour}
              onHourChange={setQuickHour}
            />
          )}
        </div>
        <div className="border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-col">
            <Button type="submit" disabled={!canSave}>
              {kind === 'missing_item'
                ? labels.shopping.addCount(listTitles.length)
                : labels.actions.save}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
