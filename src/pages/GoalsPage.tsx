import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { GoalList } from '../components/goals/GoalList';
import { ResolvedIssues } from '../components/goals/ResolvedIssues';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useDoneItems } from '../hooks/useDoneItems';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function GoalsPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const resolved = useDoneItems('issue');

  return (
    <PageShell title={labels.pages.goals} incompleteCount={items.incomplete.length}>
      <ErrorBanner message={items.error ?? resolved.error ?? entities.error} />
      <GoalList
        items={items.items}
        steps={items.steps}
        lookups={lookups}
        loading={items.loading}
      />
      <ResolvedIssues issues={resolved.items} lookups={lookups} onReopen={resolved.reopen} />
      <QuickAddSheet
        entities={entities.entities}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        defaultKind="goal"
      />
    </PageShell>
  );
}
