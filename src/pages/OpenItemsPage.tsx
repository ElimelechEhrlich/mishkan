import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { ItemList } from '../components/items/ItemList';
import { SummaryTiles } from '../components/items/SummaryTiles';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Segmented } from '../components/ui/Segmented';
import { Tabs } from '../components/ui/Tabs';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOpenSegments } from '../hooks/useOpenSegments';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';
import { formatToday } from '../lib/itemRules';
import type { KindFilter } from '../types/domain';

const kindOptions = (['task', 'goal', 'issue', 'all'] as const satisfies readonly KindFilter[]).map(
  (value) => ({ value, label: labels.kindFilter[value] }),
);

export function OpenItemsPage(): ReactElement {
  const { members, scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const scoped = useScopedItems(items, entities.entities);
  const view = useOpenSegments(scoped.assigned, scoped.steps, 'task');
  const entityCounts = useEntityCounts(items.items, lookups.domainEntities);
  const [searchParams] = useSearchParams();

  return (
    <PageShell
      title={labels.pages.open}
      subtitle={formatToday()}
      incompleteCount={scoped.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <SummaryTiles
        overdue={view.overdueCount}
        today={view.todayCount}
        incomplete={scoped.incomplete.length}
      />
      <ScopeBar
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
        counts={entityCounts.counts}
      />
      <Segmented options={kindOptions} value={view.kind} onChange={view.setKind} />
      <Tabs options={view.options} value={view.segment} onChange={view.setSegment} />
      <ItemList
        entries={view.visible}
        lookups={lookups}
        grouped={view.segment === 'active'}
        loading={items.loading}
        onComplete={items.completeItem}
      />
      <QuickAddSheet
        entities={entities.entities}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        initiallyOpen={searchParams.has('new')}
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
