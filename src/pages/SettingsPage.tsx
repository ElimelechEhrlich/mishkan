import type { ReactElement } from 'react';
import { EntitySettings } from '../components/settings/EntitySettings';
import { InviteCard } from '../components/settings/InviteCard';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function SettingsPage(): ReactElement {
  const { member, household, signOut } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();

  return (
    <PageShell
      title={labels.pages.settings}
      subtitle={household.name}
      incompleteCount={items.incomplete.length}
      inner
    >
      <ErrorBanner message={entities.error} />
      <EntitySettings member={member} entities={entities.entities} reload={entities.reload} />
      <InviteCard inviteCode={household.invite_code} />
      <Button variant="quiet" onClick={signOut}>
        {labels.actions.signOut}
      </Button>
    </PageShell>
  );
}
