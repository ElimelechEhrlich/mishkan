import type { ReactElement } from 'react';
import { EntitySettings } from '../components/settings/EntitySettings';
import { InviteCard } from '../components/settings/InviteCard';
import { NotificationsCard } from '../components/settings/NotificationsCard';
import { ProfileCard } from '../components/settings/ProfileCard';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { ListRow } from '../components/ui/ListRow';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntitySettings } from '../hooks/useEntitySettings';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function SettingsPage(): ReactElement {
  const { member, household, signOut } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const settings = useEntitySettings(member, entities.entities, entities.reload);

  return (
    <PageShell title={labels.pages.settings} incompleteCount={items.incomplete.length} inner>
      <ErrorBanner message={entities.error} />
      <ProfileCard member={member} household={household} entities={entities.entities} />
      <EntitySettings entities={entities.entities} settings={settings} />
      <NotificationsCard />
      <InviteCard inviteCode={household.invite_code} />
      <section className="flex flex-col gap-1.5">
        <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
          {labels.settings.account}
        </h2>
        <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
          <ListRow
            icon="logout"
            iconClass="bg-alert-soft text-alert"
            title={labels.actions.signOut}
            tone="alert"
            onClick={signOut}
          />
        </div>
      </section>
      <p className="pt-2 text-center text-xs text-faint">{labels.settings.about}</p>
    </PageShell>
  );
}
