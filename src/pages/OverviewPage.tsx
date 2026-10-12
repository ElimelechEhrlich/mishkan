import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { EntityProfileCard } from '../components/entities/EntityProfileCard';
import { ScopeBar } from '../components/entities/ScopeBar';
import { TopicBar } from '../components/entities/TopicBar';
import { SummaryTiles } from '../components/items/SummaryTiles';
import { OverviewCards } from '../components/overview/OverviewCards';
import { WeekSummaryCard } from '../components/overview/WeekSummaryCard';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOccasionReminders } from '../hooks/useOccasionReminders';
import { useOverview } from '../hooks/useOverview';
import { useProfileHost } from '../hooks/useProfileHost';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';
import { useWeekSummary } from '../hooks/useWeekSummary';
import { formatToday } from '../lib/itemRules';

export function OverviewPage(): ReactElement {
  const { members, scopeId, setScope, setTopic } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const scoped = useScopedItems(items, entities.entities, true);
  const overview = useOverview(scoped.items, scoped.assigned, scoped.steps);
  const entityCounts = useEntityCounts(items.items.filter(scoped.inTopic), lookups.domainEntities);
  const [searchParams] = useSearchParams();
  const week = useWeekSummary(scoped.inScope, members, items.items);
  const profile = useProfileHost(scoped.scope, entities, items);
  const remindersError = useOccasionReminders(entities.entities, items.reload);

  return (
    <PageShell
      title={scoped.scope?.name ?? labels.overview.title}
      subtitle={formatToday()}
      incompleteCount={scoped.incomplete.length}
    >
      <ErrorBanner message={items.error ?? entities.error ?? remindersError ?? week.error} />
      <ScopeBar
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
        counts={entityCounts.counts}
      />
      <TopicBar topics={scoped.topics} value={scoped.topic} onChange={setTopic} />
      {profile.profileEntity !== undefined && (
        <EntityProfileCard
          key={`profile-${profile.profileEntity.id}`}
          entity={profile.profileEntity}
          onEntityChanged={profile.onProfileSaved}
        />
      )}
      <SummaryTiles
        overdue={overview.overdue}
        today={overview.today}
        incomplete={scoped.incomplete.length}
      />
      <OverviewCards
        overview={overview}
        lookups={lookups}
        onComplete={items.completeItem}
        narrowed={scoped.topic !== null}
      />
      <WeekSummaryCard summary={week} overdue={overview.overdue} thisWeek={overview.thisWeek} />
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        initiallyOpen={searchParams.has('new')}
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
