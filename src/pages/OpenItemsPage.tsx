import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { EntityChips } from '../components/entities/EntityChips';
import { ItemList } from '../components/items/ItemList';
import { SummaryTiles } from '../components/items/SummaryTiles';
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
import { formatToday } from '../lib/itemRules';

export function OpenItemsPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const view = useOpenSegments(items.assigned, items.steps);
  const entityCounts = useEntityCounts(items.items, lookups.domainEntities);
  const [searchParams] = useSearchParams();

  return (
    <PageShell
      title={labels.pages.open}
      subtitle={formatToday()}
      incompleteCount={items.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <SummaryTiles
        overdue={view.overdueCount}
        today={view.todayCount}
        incomplete={items.incomplete.length}
      />
      <EntityChips
        entities={entities.entities}
        counts={entityCounts.counts}
        total={entityCounts.total}
      />
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
        initiallyOpen={searchParams.has('new')}
      />
    </PageShell>
  );
}
