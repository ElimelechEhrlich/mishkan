import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import {
  addDays,
  fromLocalDateTime,
  hasOwnTime,
  todayIso,
  toLocalDateTime,
} from '../../lib/itemRules';
import {
  amountText,
  describeReminder,
  isCompleteDraft,
  newDraft,
  reminderDay,
  reminderHour,
  repeatUnits,
  splitDays,
  splitMinutes,
  toMinutes,
} from '../../lib/reminders';
import type { Item, ReminderDraft, ReminderRule, RepeatUnit } from '../../types/domain';
import { Button } from '../ui/Button';
import { ChoiceGrid } from '../ui/ChoiceGrid';
import { DateField } from '../ui/DateField';
import { OptionGroup } from '../ui/OptionGroup';
import { SettingRow } from '../ui/SettingRow';
import { SettingsCard } from '../ui/SettingsCard';
import { Stepper } from '../ui/Stepper';
import { TimeField } from '../ui/TimeField';
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
  /** Opens the item's time, for a reminder that needs an hour or a date it does not have. */
  readonly onSetTime?: (() => void) | undefined;
};

const beforeUnits = ['minute', 'hour', 'day'] as const;
type BeforeUnit = (typeof beforeUnits)[number];

/** The form's fields; turned into a reminder when saved. */
type Fields = {
  readonly rule: ReminderRule;
  readonly before: number;
  readonly beforeUnit: BeforeUnit;
  readonly days: number;
  readonly hour: string;
  readonly date: string;
  readonly every: number;
  readonly unit: RepeatUnit;
  readonly until: string | null;
};

function fieldsOf(draft: ReminderDraft): Fields {
  const before = splitMinutes(draft.minutes_before ?? 0);
  const local = draft.at === null ? null : toLocalDateTime(draft.at);
  return {
    rule: draft.rule,
    // Weeks before an hour are shown as days.
    before: before.unit === 'week' ? before.amount * 7 : before.amount,
    beforeUnit: before.unit === 'week' ? 'day' : before.amount === 0 ? 'hour' : before.unit,
    days: draft.days_before ?? 0,
    hour: draft.rule === 'day' ? (draft.at_time ?? '09:00') : (local?.slice(11, 16) ?? '09:00'),
    date: local?.slice(0, 10) ?? todayIso(),
    every: draft.every ?? 1,
    unit: draft.unit ?? 'day',
    until: draft.until,
  };
}

function draftOf(fields: Fields, memberIds: readonly string[] | null): ReminderDraft {
  const at =
    fields.date === '' || fields.hour === ''
      ? null
      : fromLocalDateTime(`${fields.date}T${fields.hour}`);
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
        minutes_before: toMinutes(fields.before, fields.beforeUnit),
      };
    case 'day':
      return {
        ...base,
        rule: 'day',
        days_before: fields.days,
        at_time: fields.hour === '' ? null : fields.hour,
      };
    case 'at':
      return { ...base, rule: 'at', at };
    case 'repeat':
      return {
        ...base,
        rule: 'repeat',
        at,
        every: fields.every,
        unit: fields.unit,
        until: fields.until,
      };
  }
}

/**
 * Sets one reminder. When it rings is the main choice; its details are set in a card below it,
 * and whom it is for at the end.
 */
export function ReminderForm({
  item,
  initial,
  rules,
  people,
  onSave,
  onCancel,
  onRemove,
  onSetTime,
}: ReminderFormProps): ReactElement {
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  const [memberIds, setMemberIds] = useState<readonly string[] | null>(initial.member_ids);
  const draft = draftOf(fields, memberIds);
  // A reminder kept from before stays choosable even where it would not be offered now.
  const choices = rules.includes(initial.rule) ? rules : [initial.rule, ...rules];
  // What the item lacks for a reminder relative to its time, said with a way to set it.
  const lacking =
    !hasOwnTime(item) || item.kind === 'goal' || onSetTime === undefined
      ? null
      : reminderDay(item) === null
        ? labels.reminders.needsDate
        : reminderHour(item) === null
          ? labels.reminders.needsHour
          : null;

  function set(changes: Partial<Fields>): void {
    setFields((current) => ({ ...current, ...changes }));
  }

  function chooseRule(rule: ReminderRule): void {
    setFields(
      rule === initial.rule ? fieldsOf(initial) : fieldsOf(newDraft(rule, item, new Date())),
    );
  }

  const today = todayIso();

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-3 shadow-card">
      {choices.length > 1 && (
        <ChoiceGrid
          columns={2}
          options={choices.map((rule) => ({
            value: rule,
            label: labels.reminders.rule[rule],
          }))}
          value={fields.rule}
          onChange={chooseRule}
        />
      )}
      {lacking !== null && onSetTime !== undefined && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-paper px-3 py-2.5">
          <p className="text-[13px] text-muted">{lacking}</p>
          <Button variant="soft" onClick={onSetTime}>
            {labels.reminders.setTime}
          </Button>
        </div>
      )}

      <SettingsCard
        summary={isCompleteDraft(draft) ? describeReminder(draft) : undefined}
        actions={
          <>
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
          </>
        }
      >
        {fields.rule === 'before' && (
          <SettingRow label={labels.reminders.howLongBefore}>
            <Stepper
              value={fields.before}
              display={
                fields.before === 0
                  ? labels.reminders.atTheTime
                  : amountText(fields.before, fields.beforeUnit)
              }
              onChange={(before) => {
                set({ before });
              }}
            />
            <OptionGroup
              label={labels.reminders.howLongBefore}
              options={beforeUnits.map((unit) => ({
                value: unit,
                label: labels.reminders.unitNames[unit],
              }))}
              value={fields.beforeUnit}
              onChange={(beforeUnit) => {
                set({ beforeUnit, before: fields.before === 0 ? 1 : fields.before });
              }}
            />
          </SettingRow>
        )}

        {fields.rule === 'day' && (
          <>
            <SettingRow label={labels.reminders.howManyDaysBefore}>
              <Stepper
                value={fields.days}
                display={
                  fields.days === 0
                    ? labels.reminders.onTheDay
                    : amountText(splitDays(fields.days).amount, splitDays(fields.days).unit)
                }
                onChange={(days) => {
                  set({ days });
                }}
              />
            </SettingRow>
            <SettingRow label={labels.reminders.atWhatHour}>
              <TimeField
                label={labels.picker.pickHour}
                value={fields.hour}
                onChange={(hour) => {
                  set({ hour });
                }}
              />
            </SettingRow>
          </>
        )}

        {fields.rule === 'at' && (
          <>
            <SettingRow label={labels.reminders.date}>
              <DateField
                label={labels.picker.pickDate}
                value={fields.date}
                min={today}
                shortcuts
                onChange={(date) => {
                  set({ date });
                }}
              />
            </SettingRow>
            <SettingRow label={labels.reminders.atWhatHour}>
              <TimeField
                label={labels.picker.pickHour}
                value={fields.hour}
                onChange={(hour) => {
                  set({ hour });
                }}
              />
            </SettingRow>
          </>
        )}

        {fields.rule === 'repeat' && (
          <>
            <SettingRow label={labels.repeat.every}>
              <Stepper
                value={fields.every}
                min={1}
                onChange={(every) => {
                  set({ every });
                }}
              />
              <OptionGroup
                label={labels.repeat.every}
                options={repeatUnits.map((unit) => ({
                  value: unit,
                  label: labels.reminders.unitNames[unit],
                }))}
                value={fields.unit}
                onChange={(unit) => {
                  set({ unit });
                }}
              />
            </SettingRow>
            <SettingRow label={labels.reminders.firstRing}>
              <DateField
                label={labels.picker.pickDate}
                value={fields.date}
                min={today}
                shortcuts
                onChange={(date) => {
                  set({ date });
                }}
              />
            </SettingRow>
            <SettingRow label={labels.reminders.atWhatHour}>
              <TimeField
                label={labels.picker.pickHour}
                value={fields.hour}
                onChange={(hour) => {
                  set({ hour });
                }}
              />
            </SettingRow>
            <SettingRow label={labels.repeat.end}>
              <OptionGroup
                label={labels.repeat.end}
                options={[
                  { value: 'closed', label: labels.reminders.untilMode.closed },
                  { value: 'date', label: labels.reminders.untilMode.date },
                ]}
                value={fields.until === null ? 'closed' : 'date'}
                onChange={(mode) => {
                  set({ until: mode === 'closed' ? null : (fields.until ?? addDays(today, 30)) });
                }}
              />
              {fields.until !== null && (
                <div className="w-full">
                  <DateField
                    label={labels.repeat.untilWhich}
                    value={fields.until}
                    min={fields.date}
                    onChange={(until) => {
                      set({ until: until === '' ? null : until });
                    }}
                  />
                </div>
              )}
            </SettingRow>
          </>
        )}

        <SettingRow label={labels.push.forWhom}>
          <RecipientChips people={people} value={memberIds} onChange={setMemberIds} />
        </SettingRow>
      </SettingsCard>
    </div>
  );
}
