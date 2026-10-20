import type { ReactElement } from 'react';
import { ChatBar } from '../components/capture/ChatBar';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { HomeViews } from '../components/items/HomeViews';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useTimeline } from '../hooks/useTimeline';
import { useLookups } from '../hooks/useLookups';
import { useLooseItems } from '../hooks/useLooseItems';
import { useTodayBrief } from '../hooks/useTodayBrief';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { formatHebrewDate } from '../lib/hebrewDate';
import { formatToday, todayIso } from '../lib/itemRules';

/**
 * The home page ("בית"), where the app opens: what needs the parents now, across the whole
 * home, light at a glance; the full lists are a tap away.
 */
export function HomePage(): ReactElement {
  const { members, member } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const timeline = useTimeline(items.assigned, items.steps);
  const brief = useTodayBrief(items.items, items.steps, lookups, timeline, items.agenda);
  const loose = useLooseItems(timeline, items.items, items.updateItem, items.completeItem);

  return (
    <PageShell
      title={labels.pages.start}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      bottomBar={<ChatBar />}
    >
      <ErrorBanner message={items.error ?? entities.error ?? loose.error} />
      <HomeViews
        greeting={labels.today.greeting[brief.dayPart]}
        name={member.name}
        date={formatToday()}
        hebrewDate={formatHebrewDate(todayIso(), true)}
        next={brief.next}
        groups={brief.groups}
        timeline={timeline}
        lookups={lookups}
        loading={items.loading}
        onComplete={items.completeItem}
        waiting={brief.waiting}
        incompleteCount={items.incompleteCount}
        week={brief.week}
        loose={loose}
      />
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        raised
      />
    </PageShell>
  );
}
