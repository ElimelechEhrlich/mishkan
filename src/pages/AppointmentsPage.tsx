import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { TopicSectionList } from '../components/entities/TopicSectionList';
import { ListViewSwitch } from '../components/items/ListViewSwitch';
import { TopicBar } from '../components/entities/TopicBar';
import { ItemList } from '../components/items/ItemList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAppointments } from '../hooks/useAppointments';
import { useDomainGroups } from '../hooks/useDomainGroups';
import { useEntities } from '../hooks/useEntities';
import { useEverythingShortcut } from '../hooks/useEverythingShortcut';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function AppointmentsPage(): ReactElement {
  const { members, scopeId, setScope, setTopic, listView, setListView } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities, true);
  const lookups = useLookups(entities.entities, members);
  const appointments = useAppointments(scoped.appointments);
  const domainGroups = useDomainGroups(appointments, entities.entities, scoped.scope);
  const toEverything = useEverythingShortcut(entities.entities);

  return (
    <PageShell
      toEverything={toEverything}
      title={labels.pages.appointments}
      shortTitle={labels.nav.appointments}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <ScopeBar
        onEntityChanged={entities.reload}
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
      />
      <TopicBar topics={scoped.topics} value={scoped.topic} onChange={setTopic}>
        <ListViewSwitch value={listView} onChange={setListView} />
      </TopicBar>
      {listView === 'domain' ? (
        <TopicSectionList
          sections={domainGroups}
          lookups={lookups}
          loading={items.loading}
          onComplete={items.completeItem}
          emptyText={labels.appointment.noAppointments}
        />
      ) : (
        <ItemList
          entries={appointments}
          lookups={lookups}
          grouped
          loading={items.loading}
          onComplete={items.completeItem}
          emptyText={labels.appointment.noAppointments}
        />
      )}
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
