import type { ReactElement } from 'react';
import { AreaSettings } from '../components/settings/AreaSettings';
import { InviteCard } from '../components/settings/InviteCard';
import { MembersCard } from '../components/settings/MembersCard';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function SettingsPage(): ReactElement {
  const { member, members, household, addChild, removeChild, signOut } = useHouseholdContext();
  const areas = useAreas();
  const items = useItems();

  return (
    <PageShell
      title={labels.pages.settings}
      subtitle={household.name}
      incompleteCount={items.incomplete.length}
      inner
    >
      <ErrorBanner message={areas.error} />
      <MembersCard members={members} onAddChild={addChild} onRemoveChild={removeChild} />
      <AreaSettings member={member} areas={areas.areas} reload={areas.reload} />
      <InviteCard inviteCode={household.invite_code} />
      <Button variant="ghost" onClick={signOut}>
        {labels.actions.signOut}
      </Button>
    </PageShell>
  );
}
