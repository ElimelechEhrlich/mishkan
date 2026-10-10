import { useState } from 'react';
import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { HouseholdMenu } from '../components/household/HouseholdMenu';
import { ItemList } from '../components/items/ItemList';
import { MemberFilter } from '../components/items/MemberFilter';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function OpenItemsPage(): ReactElement {
  const { member, members, household, signOut } = useHouseholdContext();
  const areas = useAreas();
  const items = useItems();
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  return (
    <PageShell
      title={labels.pages.open}
      incompleteCount={items.incomplete.length}
      actions={<HouseholdMenu inviteCode={household.invite_code} onSignOut={signOut} />}
    >
      <ErrorBanner message={items.error ?? areas.error} />
      <MemberFilter members={members} value={memberFilter} onChange={setMemberFilter} />
      <ItemList
        items={items.assigned}
        areas={areas.areas}
        members={members}
        memberFilter={memberFilter}
        loading={items.loading}
        onComplete={items.completeItem}
      />
      <QuickAddSheet areas={areas.areas} currentMemberId={member.id} onAdd={items.addItem} />
    </PageShell>
  );
}
