import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { GoalList } from '../components/goals/GoalList';
import { ResolvedIssues } from '../components/goals/ResolvedIssues';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Tabs } from '../components/ui/Tabs';
import { labels } from '../constants/labels';
import { useDoneItems } from '../hooks/useDoneItems';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOpenSegments } from '../hooks/useOpenSegments';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function GoalsPage(): ReactElement {
  const { members, scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities);
  const lookups = useLookups(entities.entities, members);
  const resolved = useDoneItems('issue');
  const view = useOpenSegments(scoped.goals, scoped.steps);

  return (
    <PageShell title={labels.pages.goals} incompleteCount={scoped.incomplete.length}>
      <ErrorBanner message={items.error ?? resolved.error ?? entities.error} />
      <ScopeBar entities={entities.entities} scopeId={scopeId} onChange={setScope} />
      <Tabs options={view.options} value={view.segment} onChange={view.setSegment} />
      <GoalList
        entries={view.visible}
        lookups={lookups}
        loading={items.loading}
        onComplete={items.completeItem}
      />
      <ResolvedIssues
        issues={resolved.items.filter(scoped.inScope)}
        lookups={lookups}
        onReopen={resolved.reopen}
      />
      <QuickAddSheet
        entities={entities.entities}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        defaultKind="goal"
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
