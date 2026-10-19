import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Timeline } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { FocusGroup, FocusRow, WaitingOnYou, WeekDay } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { FocusCard } from './FocusCard';
import { TimelineList } from './TimelineList';
import { WaitingPills } from './WaitingPills';
import { WeekStrip } from './WeekStrip';

type TodayViewsProps = {
  readonly groups: Record<FocusGroup, readonly FocusRow[]>;
  readonly timeline: Timeline;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** What waits on the parents rather than on a date. */
  readonly waiting: WaitingOnYou;
  readonly incompleteCount: number;
  /** The coming week in short. */
  readonly week: readonly WeekDay[];
};

/**
 * The first page under its greeting: late, urgent and today to choose between, what waits on
 * the parents, and the week; or every item that runs on time, and back. It opens on the first.
 */
export function TodayViews({
  groups,
  timeline,
  lookups,
  loading,
  onComplete,
  waiting,
  incompleteCount,
  week,
}: TodayViewsProps): ReactElement {
  const [view, setView] = useState<'today' | 'all'>('today');
  if (view === 'all') {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setView('today');
          }}
          className="inline-flex min-h-9 items-center gap-1 self-start rounded-full bg-surface px-3.5 text-[13px] font-semibold text-primary shadow-card transition active:scale-[0.97]"
        >
          <Icon name="back" className="size-4" />
          {labels.today.backToToday}
        </button>
        <TimelineList
          timeline={timeline}
          lookups={lookups}
          loading={loading}
          onComplete={onComplete}
        />
      </>
    );
  }
  return (
    <>
      <FocusCard
        groups={groups}
        lookups={lookups}
        loading={loading}
        onComplete={onComplete}
        onShowAll={() => {
          setView('all');
        }}
      />
      <WaitingPills waiting={waiting} incompleteCount={incompleteCount} />
      <WeekStrip days={week} />
    </>
  );
}
