import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseLooseItems } from '../../hooks/useLooseItems';
import type { UseOtherItems } from '../../hooks/useOtherItems';
import { usePageSwipe } from '../../hooks/usePageSwipe';
import { todayIso } from '../../lib/itemRules';
import type { Timeline } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import { thisWeek } from '../../lib/todayBrief';
import type {
  FocusGroup,
  FocusRow,
  LooseGroup,
  NextUp,
  OtherGroup,
  WaitingOnYou,
  WeekDay,
} from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { Tabs } from '../ui/Tabs';
import { DayList } from './DayList';
import { DayStrip } from './DayStrip';
import { FocusCard } from './FocusCard';
import { LooseCard } from './LooseCard';
import { OtherCard } from './OtherCard';
import { StillRelevantCard } from './StillRelevantCard';
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
  /** What has no date, waits or is on the shelf, and the item asked about today. */
  readonly loose: UseLooseItems;
  /** The items with no time of their own, by kind. */
  readonly other: UseOtherItems;
};

/**
 * The home page: its greeting card with the strip of the coming days, then the chosen day (today:
 * late, urgent and today to choose between; another day: what it holds), and what waits on the
 * parents. Its second tab, "בלי תאריך", holds everything else: "עוד רלוונטי?", tasks and goals
 * with no date, waiting or on the shelf, and apart from them every item with no time of its own.
 * Together the two show every open item. Or every item that runs on time, and back.
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
  loose,
  other,
}: HomeViewsProps): ReactElement {
  const today = todayIso();
  const [view, setView] = useState<'today' | 'all'>('today');
  // The tab is kept in the address, so "עוד רלוונטי?" can open it and back returns.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'loose' ? 'loose' : 'today';
  const setTab = (next: 'today' | 'loose'): void => {
    setSearchParams(next === 'loose' ? { tab: next } : {}, { replace: true });
  };
  const todayCount = groups.overdue.length + groups.urgent.length + groups.today.length;
  const looseCount = [...Object.values(loose.groups), ...Object.values(other.groups)].reduce(
    (sum, rows) => sum + rows.length,
    0,
  );
  const tabs = (
    <Tabs
      options={[
        { value: 'today', label: labels.today.tabs.today, count: todayCount },
        { value: 'loose', label: labels.today.tabs.loose, count: looseCount },
      ]}
      value={tab}
      onChange={setTab}
    />
  );
  const [day, setDay] = useState(today);
  // One list open at a time in the tab with no date: with no date at first.
  const [opened, setOpened] = useState<
    | { readonly card: 'loose'; readonly group: LooseGroup }
    | { readonly card: 'other'; readonly group: OtherGroup }
    | null
  >({ card: 'loose', group: 'undated' });

  // Swiping the page sideways, anywhere on it, turns between the two tabs.
  const tabOrder = ['today', 'loose'] as const;
  const tabIndex = tabOrder.indexOf(tab);
  usePageSwipe({
    canGo: (step) => view === 'today' && tabIndex + step >= 0 && tabIndex + step < tabOrder.length,
    onGo: (step) => {
      setTab(tabOrder[tabIndex + step] ?? 'today');
    },
  });
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
  if (tab === 'loose') {
    return (
      <>
        {tabs}
        {loose.relevant !== null && (
          <StillRelevantCard
            key={loose.relevant.row.item.id}
            relevant={loose.relevant}
            onAnswer={loose.answer}
            onPutAside={loose.putAside}
          />
        )}
        <LooseCard
          chosen={opened?.card === 'loose' ? opened.group : null}
          onChoose={(group) => {
            setOpened(group === null ? null : { card: 'loose', group });
          }}
          groups={loose.groups}
          reasons={loose.reasons}
          lookups={lookups}
          onComplete={onComplete}
          onShowAll={() => {
            setView('all');
          }}
        />
        <OtherCard
          chosen={opened?.card === 'other' ? opened.group : null}
          onChoose={(group) => {
            setOpened(group === null ? null : { card: 'other', group });
          }}
          groups={other.groups}
          meta={other.meta}
          lookups={lookups}
        />
      </>
    );
  }
  return (
    <>
      {tabs}
      <TodayHero
        greeting={greeting}
        name={name}
        date={date}
        hebrewDate={hebrewDate}
        next={next}
        footer={
          <WaitingPills
            waiting={waiting}
            incompleteCount={incompleteCount}
            toReview={loose.relevant !== null}
          />
        }
      />
      {/* The chosen day is a tab of the card under it, which holds what that day has. */}
      <div className="flex flex-col">
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
        <div className="flex flex-col gap-2 rounded-2xl bg-primary-soft p-2">
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
        </div>
      </div>
    </>
  );
}
