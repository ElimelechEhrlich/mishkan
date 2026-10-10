import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import type { Lookups } from '../../lib/lookups';
import type {
  AreaWithDomains,
  CapturableKind,
  DebtDetails,
  Item,
  ItemUpdate,
  Member,
} from '../../types/domain';
import { DomainPicker } from '../capture/DomainPicker';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ConfirmButton } from '../ui/ConfirmButton';
import { SelectField } from '../ui/SelectField';
import { AttachmentList } from './AttachmentList';
import { ItemTextForm } from './ItemTextForm';
import { MemberPicker } from './MemberPicker';
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
  readonly areas: readonly AreaWithDomains[];
  readonly members: readonly Member[];
  readonly lookups: Lookups;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  readonly onComplete: (item: Item) => void;
  readonly onReopen: (itemId: string) => void;
  readonly onDelete: (itemId: string) => void;
  readonly onAddStep: (parent: Item, title: string) => void;
  readonly onAddChild: (name: string) => Promise<boolean>;
  readonly onPrerequisitesChange: () => void;
};

const kinds = ['task', 'goal', 'issue', 'note'] as const satisfies readonly CapturableKind[];

/** Everything about one item: text, kind, assignment, time, and what hangs on it. */
export function ItemEditor({
  item,
  items,
  steps,
  debt,
  areas,
  members,
  lookups,
  onUpdate,
  onComplete,
  onReopen,
  onDelete,
  onAddStep,
  onAddChild,
  onPrerequisitesChange,
}: ItemEditorProps): ReactElement {
  const [pickingDomain, setPickingDomain] = useState(false);

  const isStep = item.parent_id !== null;
  const isContainer = item.kind === 'goal' || item.kind === 'issue';
  const hasSchedule = item.kind !== 'note' && item.kind !== 'debt';
  const done = item.status === 'done';
  const domainLabel =
    item.domain_id === null ? labels.item.noDomain : lookups.domainLabels.get(item.domain_id);
  const goalOptions = items
    .filter((candidate) => candidate.kind === 'goal' || candidate.kind === 'issue')
    .map((candidate) => ({ value: candidate.id, label: candidate.title }));

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

      {item.kind !== 'debt' && !isStep && steps.length === 0 && (
        <Card title={labels.sections.kind}>
          <div className="flex flex-wrap gap-2">
            {kinds.map((kind) => (
              <Chip
                key={kind}
                label={labels.kind[kind]}
                selected={kind === item.kind}
                onClick={() => {
                  onUpdate(item.id, { kind });
                }}
              />
            ))}
          </div>
        </Card>
      )}

      <Card
        title={labels.sections.domain}
        aside={
          !isStep && (
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={() => {
                setPickingDomain(!pickingDomain);
              }}
            >
              {pickingDomain ? labels.actions.close : labels.actions.change}
            </button>
          )
        }
      >
        <p>{domainLabel ?? labels.item.noDomain}</p>
        {isStep && <p className="text-sm text-muted">{labels.item.inheritedDomain}</p>}
        {pickingDomain && (
          <DomainPicker
            areas={areas}
            value={item.domain_id}
            onChange={(domainId) => {
              if (domainId !== null) {
                onUpdate(item.id, { domain_id: domainId });
                setPickingDomain(false);
              }
            }}
          />
        )}
      </Card>

      {hasSchedule && (
        <Card title={labels.sections.member}>
          <MemberPicker
            members={members}
            value={item.member_id}
            onPick={(memberId) => {
              onUpdate(item.id, { member_id: memberId });
            }}
            onAddChild={onAddChild}
          />
        </Card>
      )}

      {hasSchedule && (
        <Card title={labels.sections.time}>
          <TimePicker
            key={`${item.id}-${item.time_mode ?? ''}-${item.due_date ?? ''}`}
            item={item}
            onPick={(choice) => {
              onUpdate(item.id, choice);
            }}
          />
        </Card>
      )}

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

      {item.kind === 'task' && goalOptions.length > 0 && (
        <Card title={labels.sections.parent}>
          <SelectField
            label={labels.sections.parent}
            placeholder={labels.fields.noParent}
            value={item.parent_id ?? ''}
            options={goalOptions}
            onChange={(parentId) => {
              onUpdate(item.id, { parent_id: parentId === '' ? null : parentId });
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
