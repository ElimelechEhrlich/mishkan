import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { formatMoney } from '../../lib/format';
import { activeSections, splitBySection, todayIso } from '../../lib/itemRules';
import { timeGroupsSummary } from '../../lib/itemText';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Overview, TimeGroups } from '../../hooks/useOverview';
import type { Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { OverviewCard } from './OverviewCard';
import { TimeGroup } from './TimeGroup';

type OverviewCardsProps = {
  readonly overview: Overview;
  readonly lookups: Lookups;
  readonly onComplete: (item: Item) => void;
  /** With a topic chosen, shopping and debts are left out: they have no topic. */
  readonly narrowed: boolean;
};

function total(groups: TimeGroups): number {
  return groups.active.length + groups.waiting.length + groups.someday.length;
}

function counts(groups: TimeGroups): Record<'active' | 'waiting' | 'someday', number> {
  return {
    active: groups.active.length,
    waiting: groups.waiting.length,
    someday: groups.someday.length,
  };
}

/**
 * The main page: a folding card per kind, folded to its one-line summary so the whole
 * picture fits. Opening a card shows its time groups, the near ones open, with every row.
 */
export function OverviewCards({
  overview,
  lookups,
  onComplete,
  narrowed,
}: OverviewCardsProps): ReactElement {
  const today = todayIso();
  /** Active items split by how soon they are due; the near groups open on the tasks card. */
  const sectionGroups = (entries: readonly ListEntry[], openNear: boolean): ReactElement => {
    const sections = splitBySection(entries, today);
    return (
      <>
        {activeSections.map((section) => (
          <TimeGroup
            key={section}
            label={labels.section[section]}
            entries={sections[section]}
            lookups={lookups}
            onComplete={onComplete}
            alert={section === 'overdue' || section === 'urgent'}
            defaultOpen={
              openNear &&
              (section === 'overdue' ||
                section === 'urgent' ||
                section === 'today' ||
                section === 'thisWeek')
            }
          />
        ))}
      </>
    );
  };

  const timeCard = (groups: TimeGroups, openNear: boolean): ReactElement => {
    return (
      <>
        {sectionGroups(groups.active, openNear)}
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
  };

  /** With a topic chosen, a card with nothing in it is left out so the topic stands clear. */
  const shown = (count: number): boolean => !narrowed || count > 0;
  const nothingInTopic =
    narrowed &&
    total(overview.tasks) +
      total(overview.goals) +
      overview.issues.length +
      overview.appointments.length +
      overview.notes.length ===
      0;

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
      {nothingInTopic && <EmptyState text={labels.topic.empty} />}
      {shown(total(overview.tasks)) && (
        <OverviewCard
          icon="list"
          title={labels.overview.tasks}
          summary={timeGroupsSummary(counts(overview.tasks))}
          to="/tasks"
          linkLabel={labels.overview.allTasks}
        >
          {timeCard(overview.tasks, true)}
        </OverviewCard>
      )}

      {shown(overview.appointments.length) && (
        <OverviewCard
          icon="calendar"
          title={labels.overview.appointments}
          summary={
            overview.appointments.length === 0
              ? labels.appointment.noAppointments
              : `${String(overview.appointments.length)} ${labels.overview.appointmentsCount}`
          }
          to="/appointments"
          linkLabel={labels.overview.allAppointments}
        >
          {sectionGroups(overview.appointments, true)}
        </OverviewCard>
      )}

      {shown(total(overview.goals)) && (
        <OverviewCard
          icon="target"
          title={labels.overview.goals}
          summary={timeGroupsSummary(counts(overview.goals))}
          to="/goals"
          linkLabel={labels.overview.allGoals}
        >
          {timeCard(overview.goals, true)}
        </OverviewCard>
      )}

      {shown(overview.issues.length) && (
        <OverviewCard
          icon="alert"
          title={labels.overview.issues}
          summary={
            overview.issues.length === 0
              ? labels.goals.noIssues
              : `${String(overview.issues.length)} ${labels.overview.issuesCount}`
          }
          to="/goals?tab=issues"
          linkLabel={labels.overview.allIssues}
        >
          {sectionGroups(overview.issues, true)}
        </OverviewCard>
      )}

      {shown(overview.notes.length) && (
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
      )}

      {!narrowed && (
        <>
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
        </>
      )}
    </div>
  );
}
