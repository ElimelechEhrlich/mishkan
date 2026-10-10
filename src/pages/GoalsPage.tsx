import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { GoalList } from '../components/goals/GoalList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function GoalsPage(): ReactElement {
  const { member, members } = useHouseholdContext();
  const areas = useAreas();
  const items = useItems();
  const lookups = useLookups(areas.areas, members);

  return (
    <PageShell title={labels.pages.goals} incompleteCount={items.incomplete.length}>
      <ErrorBanner message={items.error ?? areas.error} />
      <GoalList
        items={items.items}
        steps={items.steps}
        lookups={lookups}
        loading={items.loading}
      />
      <QuickAddSheet
        areas={areas.areas}
        currentMemberId={member.id}
        onAdd={items.addItem}
        defaultKind="goal"
      />
    </PageShell>
  );
}
