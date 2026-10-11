import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import { needsTime, todayIso } from '../../lib/itemRules';
import { fullTimeText } from '../../lib/itemText';
import type { Lookups } from '../../lib/lookups';
import type {
  CapturableKind,
  DebtDetails,
  EntityWithDomains,
  Item,
  ItemUpdate,
} from '../../types/domain';
import { DomainPicker } from '../capture/DomainPicker';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ConfirmButton } from '../ui/ConfirmButton';
import { PropertyRow } from '../ui/PropertyRow';
import { SelectField } from '../ui/SelectField';
import { AttachmentList } from './AttachmentList';
import { ItemTextForm } from './ItemTextForm';
import { PrerequisiteList } from './PrerequisiteList';
import { StepList } from './StepList';
import { TimePicker } from './TimePicker';

type ItemEditorProps = {
  readonly item: Item;
  /** Every open item, for choosing a parent goal or a dependency. */
  readonly items: readonly Item[];
  /** The steps of this item, when it is a goal or an issue. */
  readonly steps: readonly Item[];
  readonly debt: DebtDetails | null;
  readonly entities: readonly EntityWithDomains[];
  readonly lookups: Lookups;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  readonly onComplete: (item: Item) => void;
  readonly onReopen: (itemId: string) => void;
  readonly onDelete: (itemId: string) => void;
  readonly onAddStep: (parent: Item, title: string) => void;
  readonly onPrerequisitesChange: () => void;
};

type Row = 'kind' | 'domain' | 'time' | 'parent';

const kinds = ['task', 'goal', 'issue', 'note'] as const satisfies readonly CapturableKind[];

/** Everything about one item: text, a list of its properties, and what hangs on it. */
export function ItemEditor({
  item,
  items,
  steps,
  debt,
  entities,
  lookups,
  onUpdate,
  onComplete,
  onReopen,
  onDelete,
  onAddStep,
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
  const hasSchedule = item.kind !== 'note' && item.kind !== 'debt';
  const canChangeKind = item.kind !== 'debt' && !isStep && steps.length === 0;
  const done = item.status === 'done';

  const domainLabel = item.domain_id === null ? undefined : lookups.domainLabels.get(item.domain_id);
  const timeLabel = fullTimeText(item, todayIso());
  const goals = items.filter((candidate) => candidate.kind === 'goal' || candidate.kind === 'issue');
  const parentTitle = goals.find((goal) => goal.id === item.parent_id)?.title;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <ItemTextForm key={item.id} item={item} onUpdate={onUpdate} />
        {item.kind !== 'note' && (
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
            {done ? labels.actions.markOpen : labels.actions.markDone}
          </Button>
        )}
      </Card>

      {debt !== null && (
        <Card title={labels.sections.debt}>
          <p className="flex items-baseline justify-between gap-2">
            <span>
              {labels.debtDirection[debt.direction]}
              {labels.item.separator}
              {debt.counterparty}
            </span>
            <span className="font-display text-2xl font-bold">{formatMoney(debt.amount)}</span>
          </p>
        </Card>
      )}

      <section className="flex flex-col divide-y divide-line rounded-2xl bg-surface px-4 shadow-card">
        {canChangeKind && (
          <PropertyRow
            label={labels.sections.kind}
            value={labels.kind[item.kind]}
            open={openRow === 'kind'}
            onToggle={() => {
              toggle('kind');
            }}
          >
            <div className="flex flex-wrap gap-2">
              {kinds.map((kind) => (
                <Chip
                  key={kind}
                  label={labels.kind[kind]}
                  selected={kind === item.kind}
                  onClick={() => {
                    update({ kind });
                  }}
                />
              ))}
            </div>
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
              entities={entities}
              value={item.domain_id}
              onChange={(domainId) => {
                if (domainId !== null) {
                  update({ domain_id: domainId });
                }
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
            <TimePicker item={item} onPick={update} />
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
