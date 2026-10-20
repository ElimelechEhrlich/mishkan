import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import { daysSince } from '../../lib/todayBrief';
import type { FocusRow, LooseGroup } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { FocusLine } from './FocusLine';
import { FocusTile } from './FocusTile';

type LooseCardProps = {
  /** The open group, if any; the page keeps one open at a time. */
  readonly chosen: LooseGroup | null;
  readonly onChoose: (group: LooseGroup | null) => void;
  readonly groups: Record<LooseGroup, readonly FocusRow[]>;
  /** For each waiting item, what it waits for. */
  readonly reasons: ReadonlyMap<string, string>;
  readonly lookups: Lookups;
  readonly onComplete: (item: Item) => void;
  /** Opens every item by its time, where these stand at the end. */
  readonly onShowAll: () => void;
};

/** Lines shown before "more". */
const firstLines = 3;

const groupOrder = ['undated', 'waiting', 'someday'] as const;

/**
 * Tasks and goals with no date, waiting, or on the shelf, so nothing is lost behind what is due:
 * three numbers (one open at a time across the page, with no date at first), and the chosen group's lines, the longest untouched first, each
 * with how long it has been there (and a waiting one, what it waits for).
 */
export function LooseCard({
  chosen,
  onChoose,
  groups,
  reasons,
  lookups,
  onComplete,
  onShowAll,
}: LooseCardProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const rows = chosen === null ? [] : groups[chosen];
  const shown = expanded ? rows : rows.slice(0, firstLines);
  const hidden = rows.length - shown.length;
  const now = new Date();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[13px] font-semibold text-muted">{labels.today.looseTitle}</h2>
      <div role="tablist" className="flex gap-2">
        {groupOrder.map((group) => (
          <FocusTile
            key={group}
            label={labels.today.loose[group]}
            count={groups[group].length}
            tone="calm"
            selected={group === chosen}
            onSelect={() => {
              onChoose(group === chosen ? null : group);
              setExpanded(false);
            }}
          />
        ))}
      </div>
      {chosen !== null && (
        <div className="rounded-2xl bg-surface px-3.5 py-1 shadow-card">
          {rows.length === 0 ? (
            <p className="py-3 text-center text-[14px] text-muted">
              {labels.today.emptyLoose[chosen]}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {shown.map((row) => {
                const reason = reasons.get(row.item.id);
                return (
                  <FocusLine
                    key={row.item.id}
                    row={
                      reason === undefined
                        ? row
                        : { ...row, parentTitle: labels.today.waitingFor(reason) }
                    }
                    meta={labels.today.age(daysSince(row.item.created_at, now))}
                    alert={false}
                    quiet
                    lookups={lookups}
                    onComplete={onComplete}
                  />
                );
              })}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-line py-0.5">
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
      )}
    </section>
  );
}
