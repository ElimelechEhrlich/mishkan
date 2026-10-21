import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import { useMovePick } from '../../hooks/useMovePick';
import { canMove, firstFocus, focusMeta } from '../../lib/todayBrief';
import type { FocusGroup, FocusRow, MoveTarget } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { SkeletonList } from '../ui/SkeletonList';
import { FocusLine } from './FocusLine';
import { FocusTile } from './FocusTile';
import { MoveBar } from './MoveBar';
import { MoveButton } from './MoveButton';
import { PickLine } from './PickLine';

type FocusCardProps = {
  readonly groups: Record<FocusGroup, readonly FocusRow[]>;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** Opens every item that runs on time, by its time. */
  readonly onShowAll: () => void;
  /** Moves the chosen items: what is late or urgent to today, today's on to tomorrow. */
  readonly onMove: (items: readonly Item[], target: MoveTarget) => void;
  readonly moving: boolean;
};

/** Where each group's items move to. */
const moveTargets: Record<FocusGroup, MoveTarget> = {
  overdue: 'today',
  urgent: 'today',
  today: 'tomorrow',
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
 * chosen group's first few lines, with the rest a tap away. A button chooses some of them, the
 * whole group open, to move to today (or today's on to tomorrow).
 */
export function FocusCard({
  groups,
  lookups,
  loading,
  onComplete,
  onShowAll,
  onMove,
  moving,
}: FocusCardProps): ReactElement {
  const [chosen, setChosen] = useState<FocusGroup | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pick = useMovePick();
  const group = chosen ?? firstFocus(groups);
  const rows = groups[group];
  const shown = expanded || pick.picking ? rows : rows.slice(0, firstLines);
  const hidden = rows.length - shown.length;
  const target = moveTargets[group];
  const movable = rows.filter((row) => canMove(row.item));

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
              pick.stop();
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
            {shown.map((row) =>
              pick.picking ? (
                <PickLine
                  key={row.item.id}
                  row={row}
                  meta={focusMeta(row.item, group)}
                  picked={pick.picked.has(row.item.id)}
                  onToggle={
                    canMove(row.item)
                      ? (): void => {
                          pick.toggle(row.item.id);
                        }
                      : undefined
                  }
                />
              ) : (
                <FocusLine
                  key={row.item.id}
                  row={row}
                  meta={focusMeta(row.item, group)}
                  alert={group === 'overdue'}
                  lookups={lookups}
                  onComplete={onComplete}
                />
              ),
            )}
          </ul>
        )}
        {pick.picking ? (
          <MoveBar
            target={target}
            count={pick.picked.size}
            total={movable.length}
            busy={moving}
            onAll={(all) => {
              pick.setAll(all ? movable.map((row) => row.item.id) : []);
            }}
            onCancel={pick.stop}
            onMove={() => {
              onMove(
                movable.filter((row) => pick.picked.has(row.item.id)).map((row) => row.item),
                target,
              );
              pick.stop();
            }}
          />
        ) : (
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
            {movable.length > 0 && <MoveButton target={target} onClick={pick.start} />}
            <button
              type="button"
              onClick={onShowAll}
              className="min-h-9 rounded-full px-2 text-[13px] font-medium text-muted transition active:scale-[0.97]"
            >
              {labels.today.allTimes}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
