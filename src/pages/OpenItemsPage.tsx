import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { TopicSectionList } from '../components/entities/TopicSectionList';
import { ListViewSwitch } from '../components/items/ListViewSwitch';
import { TopicBar } from '../components/entities/TopicBar';
import { AllKindsToggle } from '../components/items/AllKindsToggle';
import { ItemList } from '../components/items/ItemList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Tabs } from '../components/ui/Tabs';
import { labels } from '../constants/labels';
import { useDomainGroups } from '../hooks/useDomainGroups';
import { useEntities } from '../hooks/useEntities';
import { useEverythingShortcut } from '../hooks/useEverythingShortcut';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOpenSegments } from '../hooks/useOpenSegments';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function OpenItemsPage(): ReactElement {
  const { members, scopeId, setScope, setTopic, listView, setListView } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const scoped = useScopedItems(items, entities.entities, true);
  const view = useOpenSegments(scoped.assigned, scoped.steps, 'task');
  const entityCounts = useEntityCounts(items.items.filter(scoped.inTopic), lookups.domainEntities);
  const domainGroups = useDomainGroups(view.visible, entities.entities, scoped.scope);
  const toEverything = useEverythingShortcut(entities.entities);

  return (
    <PageShell
      toEverything={toEverything}
      title={view.allKinds ? labels.pages.allItems : labels.pages.open}
      incompleteCount={scoped.incomplete.length}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <ScopeBar
        onEntityChanged={entities.reload}
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
        counts={entityCounts.counts}
      />
      <TopicBar topics={scoped.topics} value={scoped.topic} onChange={setTopic} />
      <ListViewSwitch value={listView} onChange={setListView} />
      <Tabs
        options={view.options}
        value={view.segment}
        onChange={view.setSegment}
        aside={<AllKindsToggle on={view.allKinds} onToggle={view.toggleAllKinds} />}
      />
      {listView === 'domain' ? (
        <TopicSectionList
          sections={domainGroups}
          lookups={lookups}
          loading={items.loading}
          onComplete={items.completeItem}
          emptyText={labels.status.emptySegment}
        />
      ) : (
        <ItemList
          entries={view.visible}
          lookups={lookups}
          grouped={view.segment === 'active'}
          loading={items.loading}
          onComplete={items.completeItem}
        />
      )}
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
