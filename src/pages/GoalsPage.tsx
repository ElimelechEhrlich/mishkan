import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { TopicBar } from '../components/entities/TopicBar';
import { TopicSectionList } from '../components/entities/TopicSectionList';
import { ResolvedIssues } from '../components/goals/ResolvedIssues';
import { ItemList } from '../components/items/ItemList';
import { ListViewSwitch } from '../components/items/ListViewSwitch';
import { SegmentChips } from '../components/items/SegmentChips';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Tabs } from '../components/ui/Tabs';
import { labels } from '../constants/labels';
import { useDoneItems } from '../hooks/useDoneItems';
import { useDomainGroups } from '../hooks/useDomainGroups';
import { useEntities } from '../hooks/useEntities';
import { useEverythingShortcut } from '../hooks/useEverythingShortcut';
import { useGoalTabs } from '../hooks/useGoalTabs';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function GoalsPage(): ReactElement {
  const { members, scopeId, setScope, setTopic, listView, setListView } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities, true);
  const lookups = useLookups(entities.entities, members);
  const resolved = useDoneItems('issue');
  const tabs = useGoalTabs(scoped.goals, scoped.steps);
  const onGoals = tabs.tab === 'goals';
  const entries = onGoals ? tabs.goals.visible : tabs.issues;
  const domainGroups = useDomainGroups(entries, entities.entities, scoped.scope);
  const toEverything = useEverythingShortcut(entities.entities);
  const emptyText = onGoals ? labels.goals.noGoals : labels.goals.noIssues;

  return (
    <PageShell
      toEverything={toEverything}
      title={labels.pages.goals}
      shortTitle={labels.nav.goals}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? resolved.error ?? entities.error} />
      <ScopeBar
        onEntityChanged={entities.reload}
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
      />
      <TopicBar topics={scoped.topics} value={scoped.topic} onChange={setTopic} />
      <ListViewSwitch value={listView} onChange={setListView} />
      <Tabs options={tabs.options} value={tabs.tab} onChange={tabs.setTab} />
      {onGoals && (
        <SegmentChips
          options={tabs.goals.options}
          value={tabs.goals.segment}
          onChange={tabs.goals.setSegment}
        />
      )}
      {listView === 'domain' ? (
        <TopicSectionList
          sections={domainGroups}
          lookups={lookups}
          loading={items.loading}
          onComplete={items.completeItem}
          emptyText={emptyText}
        />
      ) : (
        <ItemList
          entries={entries}
          lookups={lookups}
          grouped={!onGoals || tabs.goals.segment === 'active'}
          loading={items.loading}
          onComplete={items.completeItem}
          emptyText={emptyText}
        />
      )}
      {!onGoals && (
        <ResolvedIssues
          issues={resolved.items.filter(scoped.inScope)}
          lookups={lookups}
          onReopen={resolved.reopen}
        />
      )}
      <QuickAddSheet
        key={tabs.tab}
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        defaultKind={onGoals ? 'goal' : 'issue'}
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
