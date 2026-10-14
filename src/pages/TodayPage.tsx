import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { TodayList } from '../components/items/TodayList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { formatToday } from '../lib/itemRules';

/** Today across the whole home, like needs-completion: no entity or domain narrows it. */
export function TodayPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);

  return (
    <PageShell
      title={labels.pages.today}
      subtitle={formatToday()}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <TodayList
        agenda={items.agenda}
        lookups={lookups}
        loading={items.loading}
        onComplete={items.completeItem}
      />
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
      />
    </PageShell>
  );
}
