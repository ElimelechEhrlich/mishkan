import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { EntityStrip } from '../components/entities/EntityStrip';
import { ItemList } from '../components/items/ItemList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Segmented } from '../components/ui/Segmented';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOpenSegments } from '../hooks/useOpenSegments';
import { formatToday } from '../lib/itemRules';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function OpenItemsPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const view = useOpenSegments(items.assigned, items.steps);
  const counts = useEntityCounts(items.items, lookups.domainEntities);
  const [searchParams] = useSearchParams();

  return (
    <PageShell
      title={labels.pages.open}
      subtitle={formatToday()}
      incompleteCount={items.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <EntityStrip entities={entities.entities} counts={counts} />
      <Segmented options={view.options} value={view.segment} onChange={view.setSegment} />
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
