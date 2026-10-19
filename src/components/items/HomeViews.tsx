import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { todayIso } from '../../lib/itemRules';
import type { Timeline } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import { thisWeek } from '../../lib/todayBrief';
import type { FocusGroup, FocusRow, NextUp, WaitingOnYou, WeekDay } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { DayList } from './DayList';
import { DayStrip } from './DayStrip';
import { FocusCard } from './FocusCard';
import { TimelineList } from './TimelineList';
import { TodayHero } from './TodayHero';
import { WaitingPills } from './WaitingPills';

type HomeViewsProps = {
  readonly greeting: string;
  readonly name: string;
  readonly date: string;
  readonly hebrewDate: string;
  readonly next: NextUp | null;
  readonly groups: Record<FocusGroup, readonly FocusRow[]>;
  readonly timeline: Timeline;
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** What waits on the parents rather than on a date. */
  readonly waiting: WaitingOnYou;
  readonly incompleteCount: number;
  /** The six days after today. */
  readonly week: readonly WeekDay[];
};

/**
 * The home page: its greeting card with the strip of the coming days, then the chosen day (today:
 * late, urgent and today to choose between; another day: what it holds), and what waits on the
 * parents; or every item that runs on time, and back.
 */
export function HomeViews({
  greeting,
  name,
  date,
  hebrewDate,
  next,
  groups,
  timeline,
  lookups,
  loading,
  onComplete,
  waiting,
  incompleteCount,
  week,
}: HomeViewsProps): ReactElement {
  const today = todayIso();
  const [view, setView] = useState<'today' | 'all'>('today');
  const [day, setDay] = useState(today);
  const chosenDay = week.find((entry) => entry.date === day);

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
      <TodayHero greeting={greeting} name={name} date={date} hebrewDate={hebrewDate} next={next}>
        <DayStrip
          days={thisWeek(today).map((date) => ({
            date,
            past: date < today,
            count:
              date === today
                ? groups.today.length + groups.urgent.length
                : (week.find((entry) => entry.date === date)?.things.length ?? 0),
          }))}
          selected={chosenDay === undefined ? today : day}
          onSelect={setDay}
        />
      </TodayHero>
      {chosenDay === undefined ? (
        <FocusCard
          groups={groups}
          lookups={lookups}
          loading={loading}
          onComplete={onComplete}
          onShowAll={() => {
            setView('all');
          }}
        />
      ) : (
        <DayList
          day={chosenDay}
          onBack={() => {
            setDay(today);
          }}
        />
      )}
      <WaitingPills waiting={waiting} incompleteCount={incompleteCount} />
    </>
  );
}
