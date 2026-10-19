import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Agenda } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { TimeGroup } from '../overview/TimeGroup';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';

type TodayListProps = {
  readonly agenda: Agenda;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

/**
 * Today across the whole home, on one card: what is late, folded, then what is urgent,
 * then what is due today in time order, the ones with an hour first.
 */
export function TodayList({ agenda, lookups, loading, onComplete }: TodayListProps): ReactElement {
  if (
    agenda.overdue.length === 0 &&
    agenda.urgent.length === 0 &&
    agenda.today.length === 0 &&
    agenda.ended.length === 0 &&
    agenda.passed.length === 0
  ) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.today.empty} />;
  }
  return (
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <TimeGroup
        label={labels.section.overdue}
        entries={agenda.overdue}
        lookups={lookups}
        onComplete={onComplete}
        alert
      />
      <TimeGroup
        label={labels.section.urgent}
        entries={agenda.urgent}
        lookups={lookups}
        onComplete={onComplete}
        alert
        defaultOpen
      />
      <TimeGroup
        label={labels.section.today}
        entries={agenda.today}
        lookups={lookups}
        onComplete={onComplete}
        defaultOpen
      />
      <TimeGroup
        label={labels.section.ended}
        entries={agenda.ended}
        lookups={lookups}
        onComplete={onComplete}
        defaultOpen
      />
      <TimeGroup
        label={labels.section.passed}
        entries={agenda.passed}
        lookups={lookups}
        onComplete={onComplete}
      />
    </section>
  );
}
