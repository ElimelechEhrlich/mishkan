import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatDueDate } from '../../lib/itemRules';
import type { Item } from '../../types/domain';

type ItemRowProps = {
  readonly item: Item;
  readonly domainLabel: string | null;
  readonly memberName: string | null;
  readonly overdue: boolean;
  readonly onComplete: (itemId: string) => void;
};

function timeLabel(item: Item): string | null {
  if (item.time_mode === null) {
    return null;
  }
  if (item.time_mode === 'scheduled' && item.due_date !== null) {
    return formatDueDate(item.due_date);
  }
  return labels.timeMode[item.time_mode];
}

export function ItemRow({
  item,
  domainLabel,
  memberName,
  overdue,
  onComplete,
}: ItemRowProps): ReactElement {
  const details = [domainLabel, memberName, timeLabel(item)].filter((part) => part !== null);
  const canComplete = item.kind !== 'note';

  return (
    <li className="flex items-start gap-3 border-b border-soft py-3">
      {canComplete ? (
        <button
          type="button"
          aria-label={labels.actions.markDone}
          onClick={() => {
            onComplete(item.id);
          }}
          className="mt-0.5 size-7 shrink-0 border-2 border-ink bg-surface"
        />
      ) : (
        <span className="mt-0.5 size-7 shrink-0" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium break-words">{item.title}</span>
        <span className="text-sm text-muted">
          {item.kind !== 'task' && <span className="me-2 text-accent">{labels.kind[item.kind]}</span>}
          {details.join(labels.item.separator)}
          {overdue && <span className="ms-2 text-alert">{labels.item.overdue}</span>}
        </span>
      </div>
    </li>
  );
}
