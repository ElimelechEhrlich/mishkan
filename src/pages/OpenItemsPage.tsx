import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { AllKindsToggle } from '../components/items/AllKindsToggle';
import { ItemList } from '../components/items/ItemList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Tabs } from '../components/ui/Tabs';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOpenSegments } from '../hooks/useOpenSegments';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function OpenItemsPage(): ReactElement {
  const { members, scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const scoped = useScopedItems(items, entities.entities);
  const view = useOpenSegments(scoped.assigned, scoped.steps, 'task');
  const entityCounts = useEntityCounts(items.items, lookups.domainEntities);

  return (
    <PageShell
      title={view.allKinds ? labels.pages.allItems : labels.pages.open}
      incompleteCount={scoped.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <ScopeBar
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
        counts={entityCounts.counts}
      />
      <Tabs
        options={view.options}
        value={view.segment}
        onChange={view.setSegment}
        aside={<AllKindsToggle on={view.allKinds} onToggle={view.toggleAllKinds} />}
      />
      <ItemList
        entries={view.visible}
        lookups={lookups}
        grouped={view.segment === 'active'}
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
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
