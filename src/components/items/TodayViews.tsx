import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Agenda, Timeline } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { Segmented } from '../ui/Segmented';
import { TimelineList } from './TimelineList';
import { TodayList } from './TodayList';

type TodayViewsProps = {
  readonly agenda: Agenda;
  readonly timeline: Timeline;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

/** Today, or every item that runs on time; it opens on today each time. */
export function TodayViews({
  agenda,
  timeline,
  lookups,
  loading,
  onComplete,
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
        <TodayList agenda={agenda} lookups={lookups} loading={loading} onComplete={onComplete} />
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
