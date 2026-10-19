import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import { firstFocus, focusMeta } from '../../lib/todayBrief';
import type { FocusGroup, FocusRow } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { SkeletonList } from '../ui/SkeletonList';
import { FocusLine } from './FocusLine';
import { FocusTile } from './FocusTile';

type FocusCardProps = {
  readonly groups: Record<FocusGroup, readonly FocusRow[]>;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** Opens every item that runs on time, by its time. */
  readonly onShowAll: () => void;
};

/** Lines shown before "more". */
const firstLines = 4;

const tiles = [
  { group: 'overdue', label: labels.summary.overdue, tone: 'alert' },
  { group: 'urgent', label: labels.summary.urgent, tone: 'gold' },
  { group: 'today', label: labels.summary.today, tone: 'primary' },
] as const;

/**
 * Late, urgent and today on the first page, light: three numbers to choose between, and the
 * chosen group's first few lines, with the rest a tap away.
 */
export function FocusCard({
  groups,
  lookups,
  loading,
  onComplete,
  onShowAll,
}: FocusCardProps): ReactElement {
  const [chosen, setChosen] = useState<FocusGroup | null>(null);
  const [expanded, setExpanded] = useState(false);
  const group = chosen ?? firstFocus(groups);
  const rows = groups[group];
  const shown = expanded ? rows : rows.slice(0, firstLines);
  const hidden = rows.length - shown.length;

  return (
    <section className="flex flex-col gap-2">
      <div role="tablist" className="flex gap-2">
        {tiles.map((tile) => (
          <FocusTile
            key={tile.group}
            label={tile.label}
            count={groups[tile.group].length}
            tone={tile.tone}
            selected={tile.group === group}
            onSelect={() => {
              setChosen(tile.group);
              setExpanded(false);
            }}
          />
        ))}
      </div>
      <div className="rounded-2xl bg-surface px-3.5 py-1 shadow-card">
        {loading && rows.length === 0 ? (
          <SkeletonList />
        ) : rows.length === 0 ? (
          <p className="py-3 text-center text-[14px] text-muted">
            {labels.today.emptyGroup[group]}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {shown.map((row) => (
              <FocusLine
                key={row.item.id}
                row={row}
                meta={focusMeta(row.item, group)}
                alert={group === 'overdue'}
                lookups={lookups}
                onComplete={onComplete}
              />
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-line py-1.5">
          {rows.length > firstLines ? (
            <button
              type="button"
              onClick={() => {
                setExpanded(!expanded);
              }}
              className="min-h-9 rounded-full px-2 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
            >
              {hidden > 0 ? labels.today.showMore(hidden) : labels.today.showLess}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onShowAll}
            className="min-h-9 rounded-full px-2 text-[13px] font-medium text-muted transition active:scale-[0.97]"
          >
            {labels.today.allTimes}
          </button>
        </div>
      </div>
    </section>
  );
}
