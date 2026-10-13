import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { DomainSectionList } from '../components/entities/DomainSectionList';
import { ScopeBar } from '../components/entities/ScopeBar';
import { TopicBar } from '../components/entities/TopicBar';
import { TopicSectionList } from '../components/entities/TopicSectionList';
import { SummaryTiles } from '../components/items/SummaryTiles';
import { OverviewCards } from '../components/overview/OverviewCards';
import { WeekSummaryCard } from '../components/overview/WeekSummaryCard';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Segmented } from '../components/ui/Segmented';
import { labels } from '../constants/labels';
import { useAddRequest } from '../hooks/useAddRequest';
import { useEntities } from '../hooks/useEntities';
import { useEverythingShortcut } from '../hooks/useEverythingShortcut';
import { useTopicHomeView } from '../hooks/useTopicHomeView';
import { useEntityCounts } from '../hooks/useEntityCounts';
import { useEntitySections } from '../hooks/useEntitySections';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOccasionReminders } from '../hooks/useOccasionReminders';
import { useOverview } from '../hooks/useOverview';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';
import { useSlideDirection } from '../hooks/useSlideDirection';
import { useTopicSections } from '../hooks/useTopicSections';
import { useWeekSummary } from '../hooks/useWeekSummary';
import { formatToday } from '../lib/itemRules';

/** By domain is called a list while one domain is chosen. */
function homeViews(
  oneDomain: boolean,
): readonly [
  { readonly value: 'kind'; readonly label: string },
  { readonly value: 'domain'; readonly label: string },
] {
  return [
    { value: 'kind', label: labels.homeView.kind },
    { value: 'domain', label: oneDomain ? labels.listView.oneDomain : labels.homeView.domain },
  ];
}

export function OverviewPage(): ReactElement {
  const { members, scopeId, setScope, homeView, setHomeView } = useHouseholdContext();
  const chooseTopic = useTopicHomeView();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const scoped = useScopedItems(items, entities.entities, true);
  const overview = useOverview(scoped.items, scoped.assigned, scoped.steps);
  const entityCounts = useEntityCounts(
    items.assigned.filter(scoped.inTopic),
    lookups.domainEntities,
  );
  const [searchParams] = useSearchParams();
  const week = useWeekSummary(scoped.inScope, members, items.items);
  const remindersError = useOccasionReminders(entities.entities, items.reload);
  const topicSections = useTopicSections(entities.entities, scoped.items, scoped.steps);
  const entitySections = useEntitySections(scoped.scope, items.assigned, items.steps, scoped.topic);
  const add = useAddRequest();
  const direction = useSlideDirection(
    entities.entities.findIndex((entity) => entity.id === scopeId),
  );
  const toEverything = useEverythingShortcut(entities.entities);

  return (
    <PageShell
      toEverything={toEverything}
      title={scoped.scope?.name ?? labels.overview.title}
      subtitle={formatToday()}
      incompleteCount={scoped.incomplete.length}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? entities.error ?? remindersError ?? week.error} />
      <ScopeBar
        onEntityChanged={entities.reload}
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
        counts={entityCounts.counts}
      />
      <TopicBar topics={scoped.topics} value={scoped.topic} onChange={chooseTopic} />
      <Segmented
        options={homeViews(scoped.topic !== null)}
        value={homeView}
        onChange={setHomeView}
      />
      <div
        key={scopeId ?? 'all'}
        className={`flex flex-col gap-4 ${
          direction === 'next' ? 'animate-entity-next' : 'animate-entity-previous'
        }`}
      >
        {homeView === 'kind' && (
          <>
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
            <WeekSummaryCard
              summary={week}
              overdue={overview.overdue}
              thisWeek={overview.thisWeek}
            />
          </>
        )}
        {homeView === 'domain' && scoped.scope === undefined && (
          <TopicSectionList
            sections={topicSections}
            lookups={lookups}
            loading={items.loading}
            onComplete={items.completeItem}
          />
        )}
        {homeView === 'domain' && scoped.scope !== undefined && (
          <DomainSectionList
            sections={entitySections}
            lookups={lookups}
            loading={items.loading}
            onComplete={items.completeItem}
            onAdd={add.requestAdd}
          />
        )}
      </div>
      <QuickAddSheet
        key={`add-${scopeId ?? ''}-${String(add.request?.key ?? 0)}`}
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        initiallyOpen={searchParams.has('new') || add.request !== null}
        entityId={scoped.scope?.id}
        initialDomainId={add.request?.domainId}
      />
    </PageShell>
  );
}
