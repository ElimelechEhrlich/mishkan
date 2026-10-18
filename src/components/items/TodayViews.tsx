import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Agenda, Timeline } from '../../lib/itemRules';
import type { WaitingOnYou, WeekDay } from '../../lib/todayBrief';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { Segmented } from '../ui/Segmented';
import { TimelineList } from './TimelineList';
import { TodayList } from './TodayList';
import { WaitingCard } from './WaitingCard';
import { WeekStrip } from './WeekStrip';

type TodayViewsProps = {
  readonly agenda: Agenda;
  readonly timeline: Timeline;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** What waits on the parents rather than on a date, shown above today's list. */
  readonly waiting: WaitingOnYou;
  /** Every open item, to name the issue of a question. */
  readonly items: readonly Item[];
  readonly incompleteCount: number;
  /** The coming week in short, under today's list. */
  readonly week: readonly WeekDay[];
};

/**
 * Today, or every item that runs on time; it opens on today each time. Today has what waits
 * on the parents above it and the coming week in short under it.
 */
export function TodayViews({
  agenda,
  timeline,
  lookups,
  loading,
  onComplete,
  waiting,
  items,
  incompleteCount,
  week,
}: TodayViewsProps): ReactElement {
  const [view, setView] = useState<'today' | 'all'>('today');
  return (
    <>
      <Segmented
        options={[
          { value: 'today', label: labels.today.views.today },
          { value: 'all', label: labels.today.views.all },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'today' ? (
        <>
          <WaitingCard waiting={waiting} items={items} incompleteCount={incompleteCount} />
          <TodayList agenda={agenda} lookups={lookups} loading={loading} onComplete={onComplete} />
          <WeekStrip days={week} />
        </>
      ) : (
        <TimelineList
          timeline={timeline}
          lookups={lookups}
          loading={loading}
          onComplete={onComplete}
        />
      )}
    </>
  );
}
