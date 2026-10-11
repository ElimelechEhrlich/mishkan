import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ItemList } from '../components/items/ItemList';
import { EntityFilter } from '../components/items/EntityFilter';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Segmented } from '../components/ui/Segmented';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
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
  const view = useOpenSegments(items.assigned, lookups.domainEntities);
  const [searchParams] = useSearchParams();

  return (
    <PageShell
      title={labels.pages.open}
      subtitle={formatToday()}
      incompleteCount={items.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <Segmented options={view.options} value={view.segment} onChange={view.setSegment} />
      <EntityFilter
        entities={entities.entities}
        value={view.entityFilter}
        onChange={view.setEntityFilter}
      />
      <ItemList
        items={view.visible}
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
