import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';
import { EntitySettings } from '../components/settings/EntitySettings';
import { ApkUpdateCard } from '../components/settings/ApkUpdateCard';
import { AutoReminderCard } from '../components/settings/AutoReminderCard';
import { InviteCard } from '../components/settings/InviteCard';
import { NotificationsCard } from '../components/settings/NotificationsCard';
import { ProfileCard } from '../components/settings/ProfileCard';
import { SetupCard } from '../components/settings/SetupCard';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Icon } from '../components/ui/Icon';
import { InstallAppButton } from '../components/ui/InstallAppButton';
import { ListRow } from '../components/ui/ListRow';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useEntitySettings } from '../hooks/useEntitySettings';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useSetupSteps } from '../hooks/useSetupSteps';

export function SettingsPage(): ReactElement {
  const { member, household, members, signOut } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const settings = useEntitySettings(member, entities.entities, entities.reload);
  const setup = useSetupSteps(entities.entities, members.length);
  const { hash } = useLocation();

  // Arriving for a step (from the tour's end), the page opens at the place it is done.
  useEffect(() => {
    if (hash === '') {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    });
    return (): void => {
      cancelAnimationFrame(frame);
    };
  }, [hash]);

  function scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <PageShell
      title={labels.pages.settings}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
    >
      <ErrorBanner message={entities.error ?? setup.push.error} />
      <ApkUpdateCard />
      <Link
        to="/?tour=1"
        className="group block overflow-hidden rounded-2xl bg-surface shadow-card active:bg-paper"
      >
        <ListRow
          icon="help"
          title={labels.tour.replay}
          subtitle={labels.tour.replayHint}
          trailing={<Icon name="forward" className="size-4 text-faint" />}
        />
      </Link>
      <SetupCard
        steps={setup.steps}
        pushBlocked={setup.push.status === 'blocked'}
        busy={setup.push.busy}
        onSetAside={setup.setAside}
        onBringBack={setup.bringBack}
        onAct={(step) => {
          if (step === 'notifications') {
            setup.push.enable();
          } else if (step === 'children') {
            scrollTo('setup-children');
          } else if (step === 'invite') {
            scrollTo('setup-invite');
          }
        }}
      />
      <ProfileCard member={member} household={household} entities={entities.entities} />
      <div id="setup-children" className="scroll-mt-20">
        <EntitySettings entities={entities.entities} settings={settings} />
      </div>
      <InstallAppButton />
      <NotificationsCard push={setup.push} />
      <AutoReminderCard household={household} members={members} />
      <div id="setup-invite" className="scroll-mt-20">
        <InviteCard inviteCode={household.invite_code} />
      </div>
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
