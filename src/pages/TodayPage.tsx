import type { ReactElement } from 'react';
import { ChatBar } from '../components/capture/ChatBar';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { TodayViews } from '../components/items/TodayViews';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useTimeline } from '../hooks/useTimeline';
import { useLookups } from '../hooks/useLookups';
import { useTodayBrief } from '../hooks/useTodayBrief';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { formatHebrewDate } from '../lib/hebrewDate';
import { formatToday, todayIso } from '../lib/itemRules';

/** Today across the whole home, like needs-completion: no entity or domain narrows it. */
export function TodayPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const timeline = useTimeline(items.assigned, items.steps);
  const brief = useTodayBrief(items.items, items.steps, lookups, timeline);

  return (
    <PageShell
      title={labels.pages.today}
      subtitle={formatToday()}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      bottomBar={<ChatBar />}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <p className="-mt-2 text-[13px] font-medium text-muted">
        {formatHebrewDate(todayIso(), true)}
      </p>
      <TodayViews
        agenda={items.agenda}
        timeline={timeline}
        lookups={lookups}
        loading={items.loading}
        onComplete={items.completeItem}
        waiting={brief.waiting}
        items={items.items}
        incompleteCount={items.incompleteCount}
        week={brief.week}
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
