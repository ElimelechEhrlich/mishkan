import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { TopicBar } from '../components/entities/TopicBar';
import { ItemList } from '../components/items/ItemList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAppointments } from '../hooks/useAppointments';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function AppointmentsPage(): ReactElement {
  const { members, scopeId, setScope, setTopic } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities, true);
  const lookups = useLookups(entities.entities, members);
  const appointments = useAppointments(scoped.appointments);

  return (
    <PageShell title={labels.pages.appointments} incompleteCount={scoped.incomplete.length}>
      <ErrorBanner message={items.error ?? entities.error} />
      <ScopeBar entities={entities.entities} scopeId={scopeId} onChange={setScope} />
      <TopicBar topics={scoped.topics} value={scoped.topic} onChange={setTopic} />
      <ItemList
        entries={appointments}
        lookups={lookups}
        grouped
        loading={items.loading}
        onComplete={items.completeItem}
        emptyText={labels.appointment.noAppointments}
      />
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        defaultKind="appointment"
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
