import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import { fromLocalDateTime, toLocalDateTime } from '../../lib/itemRules';
import {
  beforeUnits,
  dayUnits,
  isCompleteDraft,
  newDraft,
  repeatUnits,
  splitDays,
  splitMinutes,
  toMinutes,
} from '../../lib/reminders';
import type { Item, ReminderDraft, ReminderRule } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';
import { RecipientChips } from './RecipientChips';

type ReminderFormProps = {
  readonly item: Item;
  /** What the form opens with: a reminder being changed, or a new one. */
  readonly initial: ReminderDraft;
  /** The kinds of reminder the item can have. */
  readonly rules: readonly ReminderRule[];
  readonly people: readonly ReminderPerson[];
  readonly onSave: (draft: ReminderDraft) => void;
  readonly onCancel: () => void;
  /** Given for a reminder that exists, to remove it. */
  readonly onRemove?: () => void;
};

type BeforeUnit = (typeof beforeUnits)[number];
type DayUnit = (typeof dayUnits)[number];
type RepeatUnitChoice = (typeof repeatUnits)[number];

/** The form's fields, as typed; turned into a reminder when saved. */
type Fields = {
  readonly rule: ReminderRule;
  readonly amount: string;
  readonly beforeUnit: BeforeUnit;
  readonly dayUnit: DayUnit;
  readonly repeatUnit: RepeatUnitChoice;
  readonly hour: string;
  readonly at: string;
  readonly until: string;
};

function fieldsOf(draft: ReminderDraft): Fields {
  const before = splitMinutes(draft.minutes_before ?? 0);
  const days = splitDays(draft.days_before ?? 0);
  const amount =
    draft.rule === 'before'
      ? before.amount
      : draft.rule === 'day'
        ? days.amount
        : (draft.every ?? 1);
  return {
    rule: draft.rule,
    amount: String(amount),
    beforeUnit: draft.rule === 'before' && before.amount > 0 ? before.unit : 'hour',
    dayUnit: days.unit,
    repeatUnit: draft.unit ?? 'day',
    hour: draft.at_time ?? '09:00',
    at: draft.at === null ? '' : toLocalDateTime(draft.at),
    until: draft.until ?? '',
  };
}

function draftOf(fields: Fields, memberIds: readonly string[] | null): ReminderDraft {
  const amount = Number(fields.amount);
  const whole = fields.amount.trim() !== '' && Number.isInteger(amount) && amount >= 0;
  const count = whole ? amount : null;
  const at = fields.at === '' ? null : fromLocalDateTime(fields.at);
  const base = {
    at: null,
    minutes_before: null,
    days_before: null,
    at_time: null,
    every: null,
    unit: null,
    until: null,
    member_ids: memberIds,
  } as const;
  switch (fields.rule) {
    case 'before':
      return {
        ...base,
        rule: 'before',
        minutes_before: count === null ? null : toMinutes(count, fields.beforeUnit),
      };
    case 'day':
      return {
        ...base,
        rule: 'day',
        days_before: count === null ? null : count * (fields.dayUnit === 'week' ? 7 : 1),
        at_time: fields.hour === '' ? null : fields.hour,
      };
    case 'at':
      return { ...base, rule: 'at', at };
    case 'repeat':
      return {
        ...base,
        rule: 'repeat',
        at,
        every: count,
        unit: fields.repeatUnit,
        until: fields.until === '' ? null : fields.until,
      };
  }
}

/** Sets one reminder: what kind, when, and for whom. */
export function ReminderForm({
  item,
  initial,
  rules,
  people,
  onSave,
  onCancel,
  onRemove,
}: ReminderFormProps): ReactElement {
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  const [memberIds, setMemberIds] = useState<readonly string[] | null>(initial.member_ids);
  const draft = draftOf(fields, memberIds);
  // A reminder kept from before stays choosable even where it would not be offered now.
  const choices = rules.includes(initial.rule) ? rules : [initial.rule, ...rules];

  function set(changes: Partial<Fields>): void {
    setFields((current) => ({ ...current, ...changes }));
  }

  function chooseRule(rule: ReminderRule): void {
    setFields(
      rule === initial.rule ? fieldsOf(initial) : fieldsOf(newDraft(rule, item, new Date())),
    );
  }

  const amountField = (
    <div className="w-24 shrink-0">
      <TextField
        label={fields.rule === 'repeat' ? labels.reminders.every : labels.reminders.amount}
        type="number"
        direction="ltr"
        value={fields.amount}
        onChange={(amount) => {
          set({ amount });
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-paper p-3">
      {choices.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {choices.map((rule) => (
            <Chip
              key={rule}
              label={labels.reminders.rule[rule]}
              selected={fields.rule === rule}
              onClick={() => {
                chooseRule(rule);
              }}
            />
          ))}
        </div>
      )}

      {fields.rule === 'before' && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Chip
              label={labels.reminders.atTheTime}
              selected={fields.amount === '0'}
              onClick={() => {
                set({ amount: '0' });
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            {amountField}
            <div className="flex flex-wrap gap-1.5 pb-1.5">
              {beforeUnits.map((unit) => (
                <Chip
                  key={unit}
                  label={labels.reminders.unitNames[unit]}
                  selected={fields.beforeUnit === unit && fields.amount !== '0'}
                  onClick={() => {
                    set({ beforeUnit: unit, amount: fields.amount === '0' ? '1' : fields.amount });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {fields.rule === 'day' && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Chip
              label={labels.reminders.onTheDay}
              selected={fields.amount === '0'}
              onClick={() => {
                set({ amount: '0' });
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            {amountField}
            <div className="flex flex-wrap gap-1.5 pb-1.5">
              {dayUnits.map((unit) => (
                <Chip
                  key={unit}
                  label={labels.reminders.unitNames[unit]}
                  selected={fields.dayUnit === unit && fields.amount !== '0'}
                  onClick={() => {
                    set({ dayUnit: unit, amount: fields.amount === '0' ? '1' : fields.amount });
                  }}
                />
              ))}
            </div>
          </div>
          <TextField
            label={labels.reminders.hour}
            type="time"
            direction="ltr"
            value={fields.hour}
            onChange={(hour) => {
              set({ hour });
            }}
          />
        </div>
      )}

      {fields.rule === 'at' && (
        <TextField
          label={labels.reminders.when}
          type="datetime-local"
          direction="ltr"
          value={fields.at}
          onChange={(at) => {
            set({ at });
          }}
        />
      )}

      {fields.rule === 'repeat' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            {amountField}
            <div className="flex flex-wrap gap-1.5 pb-1.5">
              {repeatUnits.map((unit) => (
                <Chip
                  key={unit}
                  label={labels.reminders.unitNames[unit]}
                  selected={fields.repeatUnit === unit}
                  onClick={() => {
                    set({ repeatUnit: unit });
                  }}
                />
              ))}
            </div>
          </div>
          <TextField
            label={labels.reminders.firstRing}
            type="datetime-local"
            direction="ltr"
            value={fields.at}
            onChange={(at) => {
              set({ at });
            }}
          />
          <TextField
            label={labels.reminders.until}
            type="date"
            direction="ltr"
            value={fields.until}
            onChange={(until) => {
              set({ until });
            }}
          />
          {fields.until === '' && (
            <p className="text-[13px] text-muted">{labels.reminders.untilClosed}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-wide text-muted">{labels.push.forWhom}</span>
        <RecipientChips people={people} value={memberIds} onChange={setMemberIds} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!isCompleteDraft(draft)}
          onClick={() => {
            onSave(draft);
          }}
        >
          {labels.actions.save}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {labels.actions.cancel}
        </Button>
        {onRemove !== undefined && (
          <Button variant="quiet" onClick={onRemove}>
            {labels.reminders.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
