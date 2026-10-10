import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { HouseholdMenu } from '../components/household/HouseholdMenu';
import { IncompleteList } from '../components/items/IncompleteList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function IncompletePage(): ReactElement {
  const { member, members, household, signOut, addChild } = useHouseholdContext();
  const areas = useAreas();
  const items = useItems();

  return (
    <PageShell
      title={labels.pages.incomplete}
      incompleteCount={items.incomplete.length}
      actions={<HouseholdMenu inviteCode={household.invite_code} onSignOut={signOut} />}
    >
      <ErrorBanner message={items.error ?? areas.error} />
      <IncompleteList
        items={items.incomplete}
        areas={areas.areas}
        members={members}
        loading={items.loading}
        onUpdate={items.updateItem}
        onAddChild={addChild}
      />
      <QuickAddSheet areas={areas.areas} currentMemberId={member.id} onAdd={items.addItem} />
    </PageShell>
  );
}
