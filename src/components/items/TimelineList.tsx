import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Timeline } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { TimeGroup } from '../overview/TimeGroup';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';

type TimelineListProps = {
  readonly timeline: Timeline;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

/**
 * Every item that runs on time, across the whole home, on one card: today's groups as on
 * the today page, and on to tomorrow, the coming week, later, no date, waiting and the
 * shelf. The long ones at the end start folded, with their count.
 */
export function TimelineList({
  timeline,
  lookups,
  loading,
  onComplete,
}: TimelineListProps): ReactElement {
  const groups = [
    { key: 'overdue', label: labels.section.overdue, entries: timeline.overdue, alert: true },
    {
      key: 'urgent',
      label: labels.section.urgent,
      entries: timeline.urgent,
      alert: true,
      open: true,
    },
    { key: 'today', label: labels.section.today, entries: timeline.today, open: true },
    { key: 'ended', label: labels.section.ended, entries: timeline.ended, open: true },
    { key: 'passed', label: labels.section.passed, entries: timeline.passed },
    { key: 'tomorrow', label: labels.today.tomorrow, entries: timeline.tomorrow, open: true },
    { key: 'thisWeek', label: labels.section.thisWeek, entries: timeline.thisWeek, open: true },
    { key: 'upcoming', label: labels.section.upcoming, entries: timeline.upcoming },
    { key: 'undated', label: labels.section.undated, entries: timeline.undated },
    { key: 'waiting', label: labels.segment.waiting, entries: timeline.waiting },
    { key: 'someday', label: labels.segment.someday, entries: timeline.someday },
  ];
  if (groups.every((group) => group.entries.length === 0)) {
    return loading ? <SkeletonList /> : <EmptyState text={labels.today.emptyAll} />;
  }
  return (
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      {groups.map((group) => (
        <TimeGroup
          key={group.key}
          label={group.label}
          entries={group.entries}
          lookups={lookups}
          onComplete={onComplete}
          alert={group.alert ?? false}
          defaultOpen={group.open ?? false}
        />
      ))}
    </section>
  );
}
