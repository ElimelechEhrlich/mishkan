import { goalProgress, goalTarget, isOpenEnded, stepsAfter } from '../../lib/goals';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { needsTime, shoppingCategories, todayIso, toLocalDateTime } from '../../lib/itemRules';
import { describeReminder, draftOf, isWaiting } from '../../lib/reminders';
import { fullTimeText } from '../../lib/itemText';
import { canSeeItem } from '../../lib/lookups';
import type { Lookups } from '../../lib/lookups';
import type {
  Conversion,
  ConvertibleKind,
  DebtDetails,
  DebtDirection,
  EntityWithDomains,
  Item,
  ItemData,
  ItemKind,
  ItemReminder,
  ItemRepeat,
  ItemUpdate,
  Occurrence,
  ReminderDraft,
  RepeatDraft,
  TrackerEntry,
} from '../../types/domain';
import { DomainPicker } from '../capture/DomainPicker';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CopyButton } from '../ui/CopyButton';
import { InlineEdit } from '../ui/InlineEdit';
import { DebtCard } from '../debts/DebtCard';
import { Chip } from '../ui/Chip';
import { ConfirmButton } from '../ui/ConfirmButton';
import { PropertyRow } from '../ui/PropertyRow';
import { SelectField } from '../ui/SelectField';
import { AppointmentActions } from './AppointmentActions';
import { AppointmentRows } from './AppointmentRows';
import { AttachmentList } from './AttachmentList';
import { ConvertPanel } from './ConvertPanel';
import { ItemTextForm } from './ItemTextForm';
import { OccurrencesCard } from './OccurrencesCard';
import { RepeatChoice } from './RepeatChoice';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import { ReminderList } from './ReminderList';
import { PrerequisiteList } from './PrerequisiteList';
import { DataSection } from './DataSection';
import { IssueTrackers } from './IssueTrackers';
import { TrackerCard } from './TrackerCard';
import type { EntryChanges } from '../../hooks/useTrackerEntries';
import { QuestionList } from './QuestionList';
import { QuestionRow } from './QuestionRow';
import { StepList } from './StepList';
import { TimePicker } from './TimePicker';

type ItemEditorProps = {
  readonly item: Item;
  /** Every open item, for choosing a parent goal or a dependency. */
  readonly items: readonly Item[];
  /** The task steps of this item, when it is a goal or an issue. */
  readonly steps: readonly Item[];
  /** The questions of this item, when it is an issue. */
  readonly questions: readonly Item[];
  /** The named values kept on this item ("נתונים"). */
  readonly data: readonly ItemData[];
  readonly onAddData: (itemId: string, label: string | null, value: string) => void;
  readonly onUpdateData: (
    dataId: string,
    changes: { label?: string | null; value?: string },
  ) => void;
  readonly onRemoveData: (dataId: string) => void;
  readonly onMoveData: (row: ItemData, step: -1 | 1) => void;
  /** The trackers inside this item, when it is an issue. */
  readonly trackers: readonly Item[];
  /** Every tracker's entries, by tracker id: this one's, and those of the issue's trackers. */
  readonly trackerEntries: ReadonlyMap<string, readonly TrackerEntry[]>;
  readonly onAddTracker: (parent: Item, title: string) => void;
  readonly onAddEntry: (itemId: string, onDate: string, value: string, note: string | null) => void;
  readonly onUpdateEntry: (entryId: string, changes: EntryChanges) => void;
  readonly onRemoveEntry: (entryId: string) => void;
  readonly debt: DebtDetails | null;
  /** Whether the item kept debt details from a time it was a debt. */
  readonly hasDebtDetails: boolean;
  readonly entities: readonly EntityWithDomains[];
  readonly lookups: Lookups;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  readonly onUpdateDebt: (
    itemId: string,
    changes: { amount?: number; direction?: DebtDirection },
  ) => void;
  /** The parents a reminder can go to. */
  readonly reminderPeople: readonly ReminderPerson[];
  readonly reminders: readonly ItemReminder[];
  /** How the item repeats, or its settings kept from before; null when it never repeated. */
  readonly repeat: ItemRepeat | null;
  /** Its occurrences that were marked or missed, newest first. */
  readonly occurrences: readonly Occurrence[];
  readonly onSetRepeat: (itemId: string, draft: RepeatDraft) => void;
  readonly onStopRepeat: (itemId: string) => void;
  readonly onResumeRepeat: (
    itemId: string,
    end: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>,
  ) => void;
  readonly onSkip: (itemId: string) => void;
  readonly onUnmarkOccurrence: (occurrenceId: string) => void;
  /** Marks a repeating item itself done, ending its series. */
  readonly onCloseItem: (itemId: string) => void;
  readonly onMoveOccurrence: (itemId: string, day: string, time: string | null) => void;
  readonly onAddReminder: (itemId: string, draft: ReminderDraft) => void;
  readonly onUpdateReminder: (reminderId: string, draft: ReminderDraft) => void;
  readonly onRemoveReminder: (reminderId: string) => void;
  /** Reloads the entities after a child or domain is added while choosing a domain. */
  readonly onStructureChanged: () => Promise<void>;
  readonly onComplete: (item: Item) => void;
  readonly onReopen: (itemId: string) => void;
  readonly onDelete: (itemId: string) => void;
  readonly onAddStep: (parent: Item, title: string) => void;
  readonly onAddQuestion: (issueId: string, title: string) => void;
  readonly onConvert: (itemId: string, conversion: Conversion) => void;
  readonly onPrerequisitesChange: () => void;
};

/** An item's reminders in a few words: the one there is, or how many. */
function remindersText(reminders: readonly ItemReminder[]): string {
  const [only] = reminders;
  const text =
    only === undefined
      ? labels.push.noReminder
      : reminders.length === 1
        ? describeReminder(draftOf(only))
        : labels.reminders.count(reminders.length);
  return reminders.some(isWaiting)
    ? `${text}${labels.item.separator}${labels.reminders.waiting}`
    : text;
}

type Row = 'kind' | 'domain' | 'inMain' | 'category' | 'time' | 'repeat' | 'reminder' | 'parent';

const convertibleKinds = [
  'task',
  'goal',
  'issue',
  'note',
  'tracker',
  'debt',
  'missing_item',
  'appointment',
] as const satisfies readonly ConvertibleKind[];

function asConvertible(kind: ItemKind): ConvertibleKind | null {
  return convertibleKinds.find((candidate) => candidate === kind) ?? null;
}

function doneLabel(kind: ItemKind, done: boolean): string {
  if (kind === 'issue') {
    return done ? labels.actions.markUnresolved : labels.actions.markResolved;
  }
  if (kind === 'missing_item') {
    return done ? labels.actions.markNotBought : labels.actions.markBought;
  }
  if (kind === 'shopping_run' && !done) {
    return labels.actions.finishRun;
  }
  return done ? labels.actions.markOpen : labels.actions.markDone;
}

/** Everything about one item: text, a list of its properties, and what hangs on it. */
export function ItemEditor({
  item,
  items,
  steps,
  questions,
  data,
  onAddData,
  onUpdateData,
  onRemoveData,
  onMoveData,
  trackers,
  trackerEntries,
  onAddTracker,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  debt,
  hasDebtDetails,
  entities,
  lookups,
  onUpdate,
  onUpdateDebt,
  reminderPeople,
  reminders,
  repeat,
  occurrences,
  onSetRepeat,
  onStopRepeat,
  onResumeRepeat,
  onSkip,
  onUnmarkOccurrence,
  onCloseItem,
  onMoveOccurrence,
  onAddReminder,
  onUpdateReminder,
  onRemoveReminder,
  onStructureChanged,
  onComplete,
  onReopen,
  onDelete,
  onAddStep,
  onAddQuestion,
  onConvert,
  onPrerequisitesChange,
}: ItemEditorProps): ReactElement {
  const [openRow, setOpenRow] = useState<Row | null>(null);

  function toggle(row: Row): void {
    setOpenRow(openRow === row ? null : row);
  }

  function update(changes: ItemUpdate): void {
    onUpdate(item.id, changes);
    setOpenRow(null);
  }

  const isStep = item.parent_id !== null;
  const isContainer = item.kind === 'goal' || item.kind === 'issue';
  const isShopping = item.kind === 'missing_item' || item.kind === 'shopping_run';
  const isQuestion = item.kind === 'question';
  const isAppointment = item.kind === 'appointment';
  // An issue has no time of its own: the dates are on its steps.
  const hasSchedule =
    item.kind !== 'note' &&
    item.kind !== 'tracker' &&
    item.kind !== 'debt' &&
    item.kind !== 'issue' &&
    !isShopping &&
    !isQuestion &&
    !isAppointment;
  // An item of a separate entity (a circle) shows with everything only when marked so.
  const inCircle = entities.some(
    (entity) =>
      entity.kind === 'circle' && entity.domains.some((domain) => domain.id === item.domain_id),
  );
  const healthDomain = entities.some((entity) =>
    entity.domains.some(
      (domain) =>
        domain.id === item.domain_id && domain.name.includes(labels.appointment.healthDomain),
    ),
  );
  const convertible = isStep ? null : asConvertible(item.kind);
  // A missing item can only move to the shopping domain of another entity, and anything
  // else stays out of shopping domains (it becomes a missing item by converting it).
  // An entity chosen before any domain, shown until a domain is chosen.
  const pendingEntityName =
    item.domain_id === null
      ? entities.find((entity) => entity.id === item.entity_id)?.name
      : undefined;
  const domainChoices = entities.map((entity) => ({
    ...entity,
    domains: entity.domains.filter((domain) => (domain.role === 'shopping') === isShopping),
  }));
  const done = item.status === 'done';
  // A repeating item: its own button marks the current occurrence, or, once none is left,
  // the item itself.
  const repeatable =
    item.kind === 'task' ||
    item.kind === 'appointment' ||
    item.kind === 'tracker' ||
    item.kind === 'missing_item';
  const repeating = repeatable && item.time_mode === 'recurring' && repeat !== null;
  const repeatControls = {
    repeat,
    gone: occurrences.filter((occurrence) => occurrence.status !== 'closed_with_parent').length,
    onSave: (draft: RepeatDraft): void => {
      onSetRepeat(item.id, draft);
    },
    onStop: (): void => {
      onStopRepeat(item.id);
    },
    onResume: (end: Pick<RepeatDraft, 'endKind' | 'endCount' | 'endUntil'>): void => {
      onResumeRepeat(item.id, end);
    },
  };
  // A reminder can only go to a parent who can see the item (not the other parent's private
  // entity, nor someone else's "needs completion").
  const reachable = reminderPeople.filter((person) => canSeeItem(item, entities, person.id));

  const domainLabel =
    item.domain_id === null ? undefined : lookups.domainLabels.get(item.domain_id);
  const timeLabel = fullTimeText(item, todayIso());
  const goals = items.filter(
    (candidate) => candidate.kind === 'goal' || candidate.kind === 'issue',
  );
  const parent = goals.find((goal) => goal.id === item.parent_id);
  const parentTitle = parent?.title;
  const progress = goalProgress(steps, lookups.repeats, lookups.occurrenceCounts);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <ItemTextForm key={item.id} item={item} onUpdate={onUpdate} />
        {item.kind !== 'note' && item.kind !== 'tracker' && !isQuestion && (
          <Button
            variant={done ? 'ghost' : 'soft'}
            onClick={() => {
              if (done) {
                onReopen(item.id);
              } else if (repeating && item.due_date === null) {
                onCloseItem(item.id);
              } else {
                onComplete(item);
              }
            }}
          >
            {repeating && !done
              ? item.due_date === null
                ? labels.occurrence.closeItem
                : labels.occurrence.markCurrentDone
              : doneLabel(item.kind, done)}
          </Button>
        )}
        {isAppointment && <AppointmentActions item={item} />}
        {/* Every step done: the goal may be reached, but it is closed only when asked. */}
        {item.kind === 'goal' && !done && progress.allDone && (
          <p className="text-center text-sm font-semibold text-primary">
            {labels.goals.allStepsDone}
          </p>
        )}
      </Card>

      {debt !== null && (
        <DebtCard
          debt={debt}
          onChange={(changes) => {
            onUpdateDebt(item.id, changes);
          }}
        />
      )}

      <section className="flex flex-col divide-y divide-line rounded-2xl bg-surface px-4 shadow-card">
        {convertible !== null && (
          <PropertyRow
            label={labels.sections.kind}
            value={labels.kind[item.kind]}
            open={openRow === 'kind'}
            onToggle={() => {
              toggle('kind');
            }}
          >
            <ConvertPanel
              key={item.id}
              item={item}
              kind={convertible}
              hasSteps={steps.length > 0 || questions.length > 0 || trackers.length > 0}
              hasDebtDetails={hasDebtDetails}
              repeat={repeat}
              reminders={reminders}
              onConvert={(conversion) => {
                onConvert(item.id, conversion);
                setOpenRow(null);
              }}
            />
          </PropertyRow>
        )}

        {isStep ? (
          <PropertyRow
            label={labels.sections.domain}
            value={domainLabel ?? labels.item.noDomain}
            hint={
              parent?.kind === 'issue'
                ? labels.item.inheritedDomainIssue
                : labels.item.inheritedDomain
            }
            open={false}
            onToggle={() => {
              setOpenRow(null);
            }}
          />
        ) : (
          <PropertyRow
            label={labels.sections.domain}
            value={
              domainLabel ??
              (pendingEntityName === undefined
                ? labels.status.notSet
                : `${pendingEntityName}${labels.item.separator}${labels.status.notSet}`)
            }
            missing={domainLabel === undefined}
            open={openRow === 'domain'}
            onToggle={() => {
              toggle('domain');
            }}
          >
            <DomainPicker
              entities={domainChoices}
              value={item.domain_id}
              initialEntityId={item.entity_id}
              onEntityChange={(entityId) => {
                // Kept only while there is no domain; a domain decides the entity.
                if (item.domain_id === null) {
                  update({ entity_id: entityId });
                }
              }}
              onStructureChanged={onStructureChanged}
              onChange={(domainId) => {
                if (domainId !== null) {
                  update({ domain_id: domainId });
                }
              }}
            />
          </PropertyRow>
        )}

        {inCircle && !isStep && (
          <PropertyRow
            label={labels.inMain.label}
            value={item.in_main ? labels.inMain.shown : labels.inMain.hidden}
            open={openRow === 'inMain'}
            onToggle={() => {
              toggle('inMain');
            }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Chip
                  label={labels.inMain.hide}
                  selected={!item.in_main}
                  onClick={() => {
                    update({ in_main: false });
                  }}
                />
                <Chip
                  label={labels.inMain.show}
                  selected={item.in_main}
                  onClick={() => {
                    update({ in_main: true });
                  }}
                />
              </div>
              <p className="text-[13px] text-muted">{labels.inMain.hint}</p>
            </div>
          </PropertyRow>
        )}

        {item.kind === 'missing_item' && (
          <PropertyRow
            label={labels.shopping.category}
            value={
              item.shopping_category === null
                ? labels.status.notSet
                : labels.shoppingCategory[item.shopping_category]
            }
            open={openRow === 'category'}
            onToggle={() => {
              toggle('category');
            }}
          >
            <div className="flex flex-wrap gap-2">
              {shoppingCategories.map((category) => (
                <Chip
                  key={category}
                  label={labels.shoppingCategory[category]}
                  selected={category === item.shopping_category}
                  onClick={() => {
                    update({ shopping_category: category });
                  }}
                />
              ))}
            </div>
          </PropertyRow>
        )}

        {isAppointment && (
          <AppointmentRows
            key={[
              item.id,
              item.starts_at,
              item.place_kind,
              item.place,
              item.meeting_url,
              item.with_whom,
            ].join('|')}
            item={item}
            health={healthDomain}
            onUpdate={(changes) => {
              // A repeating appointment moves only this time; the rhythm goes on.
              if (repeating && changes.starts_at !== undefined && changes.starts_at !== null) {
                const local = toLocalDateTime(changes.starts_at);
                onMoveOccurrence(item.id, local.slice(0, 10), local.slice(11, 16));
                return;
              }
              onUpdate(item.id, changes);
            }}
          />
        )}

        {!isStep && (isAppointment || item.kind === 'tracker' || item.kind === 'missing_item') && (
          <PropertyRow
            label={labels.repeat.repeats}
            value={repeating ? (timeLabel ?? labels.repeat.repeats) : labels.repeat.noRepeat}
            open={openRow === 'repeat'}
            onToggle={() => {
              toggle('repeat');
            }}
          >
            <RepeatChoice
              item={item}
              repeat={repeatControls}
              onNoRepeat={() => {
                onUpdate(
                  item.id,
                  isAppointment
                    ? { time_mode: 'scheduled', recurrence_rule: null }
                    : { time_mode: null, due_date: null, due_time: null, recurrence_rule: null },
                );
              }}
              onDone={() => {
                setOpenRow(null);
              }}
            />
          </PropertyRow>
        )}

        {hasSchedule && (
          <PropertyRow
            label={labels.sections.time}
            value={timeLabel ?? labels.status.notSet}
            missing={timeLabel === null && needsTime(item)}
            open={openRow === 'time'}
            onToggle={() => {
              toggle('time');
            }}
          >
            <TimePicker
              item={item}
              onPick={update}
              limit={parent === undefined ? null : goalTarget(parent)}
              goalSteps={
                item.kind === 'goal'
                  ? {
                      // Only a new or earlier date is checked; steps that repeat with no end
                      // will end on it.
                      after: (day): readonly Item[] => {
                        const target = goalTarget(item);
                        return target !== null && day >= target
                          ? []
                          : stepsAfter(steps, day, lookups.repeats, lookups.occurrenceCounts, true);
                      },
                      openEnded: steps.filter((step) =>
                        isOpenEnded(step, lookups.repeats.get(step.id)),
                      ).length,
                    }
                  : undefined
              }
              repeat={{
                ...repeatControls,
                onSave: (draft) => {
                  repeatControls.onSave(draft);
                  setOpenRow(null);
                },
                onStop: () => {
                  repeatControls.onStop();
                  setOpenRow(null);
                },
                onResume: (end) => {
                  repeatControls.onResume(end);
                  setOpenRow(null);
                },
              }}
            />
          </PropertyRow>
        )}

        {item.status === 'open' && (item.kind !== 'missing_item' || repeating) && (
          <PropertyRow
            label={labels.reminders.title}
            value={remindersText(reminders)}
            missing={reminders.some(isWaiting)}
            open={openRow === 'reminder'}
            onToggle={() => {
              toggle('reminder');
            }}
          >
            <ReminderList
              item={item}
              reminders={reminders}
              people={reachable}
              onAdd={(draft) => {
                onAddReminder(item.id, draft);
              }}
              onUpdate={onUpdateReminder}
              onRemove={onRemoveReminder}
              onSetTime={
                hasSchedule
                  ? (): void => {
                      setOpenRow('time');
                    }
                  : undefined
              }
            />
          </PropertyRow>
        )}

        {item.kind === 'task' && goals.length > 0 && (
          <PropertyRow
            label={labels.sections.parent}
            value={parentTitle ?? labels.fields.noParent}
            open={openRow === 'parent'}
            onToggle={() => {
              toggle('parent');
            }}
          >
            <SelectField
              label={labels.sections.parent}
              placeholder={labels.fields.noParent}
              value={item.parent_id ?? ''}
              options={goals.map((goal) => ({ value: goal.id, label: goal.title }))}
              onChange={(parentId) => {
                update({ parent_id: parentId === '' ? null : parentId });
              }}
            />
          </PropertyRow>
        )}
      </section>

      {repeating && !done && (
        <OccurrencesCard
          item={item}
          repeat={repeat}
          occurrences={occurrences}
          onSkip={() => {
            onSkip(item.id);
          }}
          onMove={(day, time) => {
            onMoveOccurrence(item.id, day, time);
          }}
          onDone={
            item.kind === 'tracker' && item.due_date !== null
              ? (): void => {
                  onComplete(item);
                }
              : undefined
          }
          onUnmark={onUnmarkOccurrence}
          onClose={() => {
            onCloseItem(item.id);
          }}
        />
      )}

      {item.time_mode === 'waiting' && (
        <Card title={labels.sections.prerequisites}>
          <PrerequisiteList item={item} candidates={items} onChange={onPrerequisitesChange} />
        </Card>
      )}

      {isQuestion && (
        <Card title={labels.questions.answer}>
          <ul>
            <QuestionRow question={item} onUpdate={onUpdate} standalone />
          </ul>
        </Card>
      )}

      {item.kind === 'tracker' && (
        <TrackerCard
          item={item}
          entries={trackerEntries.get(item.id) ?? []}
          onUpdateItem={(changes) => {
            onUpdate(item.id, changes);
          }}
          onAdd={(onDate, value, note) => {
            onAddEntry(item.id, onDate, value, note);
          }}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
        />
      )}

      {/* A note that is one value: its title is the name, and here is the value. */}
      {item.kind === 'note' && item.is_value && (
        <Card title={labels.data.valueTitle}>
          <div className="flex items-center gap-2">
            <InlineEdit
              value={item.answer ?? ''}
              textClass="font-display text-2xl font-bold"
              onSave={(answer) => {
                onUpdate(item.id, { answer });
              }}
            />
            {item.answer !== null && item.answer !== '' && <CopyButton text={item.answer} />}
          </div>
        </Card>
      )}

      {/* Notes and issues hold rows; any other item shows those it kept. */}
      {((item.kind === 'note' && !item.is_value) || item.kind === 'issue' || data.length > 0) && (
        <Card title={item.kind === 'issue' ? labels.data.title : labels.data.noteTitle}>
          <DataSection
            rows={data}
            onAdd={(label, value) => {
              onAddData(item.id, label, value);
            }}
            onUpdate={onUpdateData}
            onRemove={onRemoveData}
            onMove={onMoveData}
          />
        </Card>
      )}

      {item.kind === 'issue' && (
        <Card title={labels.sections.questions}>
          <QuestionList
            questions={questions}
            onUpdate={onUpdate}
            onAdd={(title) => {
              onAddQuestion(item.id, title);
            }}
          />
        </Card>
      )}

      {isContainer && (
        <Card title={labels.sections.steps}>
          <StepList
            parent={item}
            steps={steps}
            lookups={lookups}
            onComplete={onComplete}
            onReopen={onReopen}
            onAdd={(title) => {
              onAddStep(item, title);
            }}
          />
        </Card>
      )}

      {item.kind === 'issue' && (
        <Card title={labels.tracker.title}>
          <IssueTrackers
            trackers={trackers}
            entries={trackerEntries}
            onAdd={(title) => {
              onAddTracker(item, title);
            }}
          />
        </Card>
      )}

      <Card title={labels.sections.attachments}>
        <AttachmentList key={item.id} item={item} />
      </Card>

      <ConfirmButton
        label={labels.actions.delete}
        confirmLabel={labels.actions.confirmDelete}
        onConfirm={() => {
          onDelete(item.id);
        }}
      />
    </div>
  );
}
