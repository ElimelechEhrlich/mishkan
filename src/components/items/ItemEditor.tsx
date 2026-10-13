import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import { formatReminder, needsTime, shoppingCategories, todayIso } from '../../lib/itemRules';
import { fullTimeText } from '../../lib/itemText';
import type { Lookups } from '../../lib/lookups';
import type {
  Conversion,
  ConvertibleKind,
  DebtDetails,
  EntityWithDomains,
  Item,
  ItemKind,
  ItemUpdate,
} from '../../types/domain';
import { DomainPicker } from '../capture/DomainPicker';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ConfirmButton } from '../ui/ConfirmButton';
import { PropertyRow } from '../ui/PropertyRow';
import { SelectField } from '../ui/SelectField';
import { AppointmentActions } from './AppointmentActions';
import { AppointmentRows } from './AppointmentRows';
import { AttachmentList } from './AttachmentList';
import { ConvertPanel } from './ConvertPanel';
import { ItemTextForm } from './ItemTextForm';
import type { ReminderPerson } from '../../hooks/useReminderPeople';
import { ReminderPicker } from './ReminderPicker';
import { PrerequisiteList } from './PrerequisiteList';
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
  readonly debt: DebtDetails | null;
  /** Whether the item kept debt details from a time it was a debt. */
  readonly hasDebtDetails: boolean;
  readonly entities: readonly EntityWithDomains[];
  readonly lookups: Lookups;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  /** The parents a reminder can go to. */
  readonly reminderPeople: readonly ReminderPerson[];
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

/** When a reminder rings, and for whom when it is not for everyone. */
function reminderText(item: Item, people: readonly ReminderPerson[]): string {
  if (item.remind_at === null) {
    return item.kind === 'appointment' ? labels.push.appointmentAuto : labels.push.noReminder;
  }
  const when = formatReminder(item.remind_at);
  if (item.remind_member_ids === null) {
    return when;
  }
  const names = people
    .filter((person) => item.remind_member_ids?.includes(person.id) === true)
    .map((person) => person.name)
    .join(', ');
  return `${when}${labels.item.separator}${labels.push.toPrefix}${names}`;
}

type Row = 'kind' | 'domain' | 'inMain' | 'category' | 'time' | 'reminder' | 'parent';

const convertibleKinds = [
  'task',
  'goal',
  'issue',
  'note',
  'debt',
  'missing_item',
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
  debt,
  hasDebtDetails,
  entities,
  lookups,
  onUpdate,
  reminderPeople,
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
  const domainChoices = entities.map((entity) => ({
    ...entity,
    domains: entity.domains.filter((domain) => (domain.role === 'shopping') === isShopping),
  }));
  const done = item.status === 'done';

  const domainLabel =
    item.domain_id === null ? undefined : lookups.domainLabels.get(item.domain_id);
  const timeLabel = fullTimeText(item, todayIso());
  const goals = items.filter(
    (candidate) => candidate.kind === 'goal' || candidate.kind === 'issue',
  );
  const parentTitle = goals.find((goal) => goal.id === item.parent_id)?.title;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <ItemTextForm key={item.id} item={item} onUpdate={onUpdate} />
        {item.kind !== 'note' && !isQuestion && (
          <Button
            variant={done ? 'ghost' : 'soft'}
            onClick={() => {
              if (done) {
                onReopen(item.id);
              } else {
                onComplete(item);
              }
            }}
          >
            {doneLabel(item.kind, done)}
          </Button>
        )}
        {isAppointment && <AppointmentActions item={item} />}
      </Card>

      {debt !== null && (
        <Card title={labels.sections.debt}>
          <p className="flex items-baseline justify-between gap-2">
            <span>
              {labels.debtDirection[debt.direction]}
              {labels.item.separator}
              {item.title}
            </span>
            <span className="font-display text-2xl font-bold">{formatMoney(debt.amount)}</span>
          </p>
        </Card>
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
              hasSteps={steps.length > 0 || questions.length > 0}
              hasDebtDetails={hasDebtDetails}
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
            hint={labels.item.inheritedDomain}
            open={false}
            onToggle={() => {
              setOpenRow(null);
            }}
          />
        ) : (
          <PropertyRow
            label={labels.sections.domain}
            value={domainLabel ?? labels.status.notSet}
            missing={domainLabel === undefined}
            open={openRow === 'domain'}
            onToggle={() => {
              toggle('domain');
            }}
          >
            <DomainPicker
              entities={domainChoices}
              value={item.domain_id}
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
              onUpdate(item.id, changes);
            }}
          />
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
            <TimePicker item={item} onPick={update} />
          </PropertyRow>
        )}

        {item.status === 'open' && item.kind !== 'missing_item' && (
          <PropertyRow
            label={labels.push.reminder}
            value={reminderText(item, reminderPeople)}
            open={openRow === 'reminder'}
            onToggle={() => {
              toggle('reminder');
            }}
          >
            <ReminderPicker
              key={`${item.remind_at ?? ''}-${(item.remind_member_ids ?? []).join(',')}`}
              remindAt={item.remind_at}
              memberIds={item.remind_member_ids}
              dueDate={item.due_date}
              people={reminderPeople}
              onChange={(choice) => {
                update({
                  remind_at: choice.remindAt,
                  remind_member_ids: choice.memberIds === null ? null : [...choice.memberIds],
                });
                setOpenRow(null);
              }}
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
            steps={steps}
            onComplete={onComplete}
            onReopen={onReopen}
            onAdd={(title) => {
              onAddStep(item, title);
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
