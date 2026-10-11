import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { SummaryTiles } from '../components/items/SummaryTiles';
import { OverviewCards } from '../components/overview/OverviewCards';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOccasionReminders } from '../hooks/useOccasionReminders';
import { useOverview } from '../hooks/useOverview';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';
import { formatToday } from '../lib/itemRules';

export function OverviewPage(): ReactElement {
  const { members, scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const scoped = useScopedItems(items, entities.entities);
  const overview = useOverview(scoped.items, scoped.assigned, scoped.steps);
  const entityCounts = useEntityCounts(items.items, lookups.domainEntities);
  const [searchParams] = useSearchParams();
  const remindersError = useOccasionReminders(entities.entities, items.reload);

  return (
    <PageShell
      title={scoped.scope?.name ?? labels.overview.title}
      subtitle={formatToday()}
      incompleteCount={scoped.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error ?? remindersError} />
      <ScopeBar
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
        counts={entityCounts.counts}
      />
      <SummaryTiles
        overdue={overview.overdue}
        today={overview.today}
        incomplete={scoped.incomplete.length}
      />
      <OverviewCards overview={overview} lookups={lookups} onComplete={items.completeItem} />
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
