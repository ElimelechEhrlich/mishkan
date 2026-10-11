import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import { timeGroupsSummary } from '../../lib/itemText';
import type { Lookups } from '../../lib/lookups';
import type { Overview, TimeGroups } from '../../hooks/useOverview';
import type { Item } from '../../types/domain';
import { OverviewCard } from './OverviewCard';
import { TimeGroup } from './TimeGroup';

type OverviewCardsProps = {
  readonly overview: Overview;
  readonly lookups: Lookups;
  readonly onComplete: (item: Item) => void;
};

function counts(groups: TimeGroups): Record<'active' | 'waiting' | 'someday', number> {
  return {
    active: groups.active.length,
    waiting: groups.waiting.length,
    someday: groups.someday.length,
  };
}

/**
 * The main page: a folding card per kind. Tasks open on their active group;
 * everything else stays folded to its one-line summary, so the whole picture fits.
 */
export function OverviewCards({ overview, lookups, onComplete }: OverviewCardsProps): ReactElement {
  const timeCard = (groups: TimeGroups, openActive: boolean): ReactElement => (
    <>
      <TimeGroup
        label={labels.segment.active}
        entries={groups.active}
        lookups={lookups}
        onComplete={onComplete}
        defaultOpen={openActive}
      />
      <TimeGroup
        label={labels.segment.waiting}
        entries={groups.waiting}
        lookups={lookups}
        onComplete={onComplete}
      />
      <TimeGroup
        label={labels.segment.someday}
        entries={groups.someday}
        lookups={lookups}
        onComplete={onComplete}
      />
    </>
  );

  const debtSummary =
    overview.debtCount === 0
      ? labels.overview.noDebts
      : [
          overview.owedToUs > 0
            ? `${labels.debtDirection.owed_to_us} ${formatMoney(overview.owedToUs)}`
            : null,
          overview.weOwe > 0
            ? `${labels.debtDirection.we_owe} ${formatMoney(overview.weOwe)}`
            : null,
        ]
          .filter((part) => part !== null)
          .join(labels.item.separator);

  return (
    <div className="flex flex-col gap-2.5">
      <OverviewCard
        icon="list"
        title={labels.overview.tasks}
        summary={timeGroupsSummary(counts(overview.tasks))}
        to="/tasks"
        linkLabel={labels.overview.allTasks}
        defaultOpen
      >
        {timeCard(overview.tasks, true)}
      </OverviewCard>

      <OverviewCard
        icon="target"
        title={labels.overview.goals}
        summary={timeGroupsSummary(counts(overview.goals))}
        to="/goals"
        linkLabel={labels.overview.allGoals}
      >
        {timeCard(overview.goals, true)}
      </OverviewCard>

      <OverviewCard
        icon="note"
        title={labels.overview.notes}
        summary={
          overview.notes.length === 0
            ? labels.status.noNotes
            : `${String(overview.notes.length)} ${labels.overview.notesCount}`
        }
        to="/notes"
        linkLabel={labels.overview.allNotes}
      >
        <TimeGroup
          label={labels.overview.latest}
          entries={overview.notes}
          lookups={lookups}
          onComplete={onComplete}
          defaultOpen
        />
      </OverviewCard>

      <OverviewCard
        icon="cart"
        title={labels.overview.shopping}
        summary={
          overview.shoppingCount === 0
            ? labels.status.noMissingItems
            : `${String(overview.shoppingCount)} ${labels.overview.missingCount}`
        }
        to="/shopping"
        linkLabel={labels.overview.allShopping}
      >
        {overview.shopping.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3.5 py-3">
            {overview.shopping.map((group) => (
              <span
                key={group.category}
                className="flex h-7 items-center gap-1.5 rounded-full bg-paper px-3 text-[13px] font-medium"
              >
                {labels.shoppingCategory[group.category]}
                <span className="text-xs text-muted">{String(group.count)}</span>
              </span>
            ))}
          </div>
        )}
      </OverviewCard>

      <OverviewCard
        icon="wallet"
        title={labels.overview.debts}
        summary={debtSummary}
        to="/debts"
        linkLabel={labels.overview.allDebts}
      >
        <div className="grid grid-cols-2">
          <div className="flex flex-col px-3.5 py-3">
            <span className="font-display text-lg font-bold text-primary tabular-nums">
              {formatMoney(overview.owedToUs)}
            </span>
            <span className="text-xs text-muted">{labels.debtDirection.owed_to_us}</span>
          </div>
          <div className="flex flex-col border-s border-line px-3.5 py-3">
            <span className="font-display text-lg font-bold text-alert tabular-nums">
              {formatMoney(overview.weOwe)}
            </span>
            <span className="text-xs text-muted">{labels.debtDirection.we_owe}</span>
          </div>
        </div>
      </OverviewCard>
    </div>
  );
}
