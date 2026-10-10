import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Card } from '../ui/Card';

type InviteCardProps = {
  readonly inviteCode: string;
};

/** Sends the second parent a link that opens the app ready to join this household. */
export function InviteCard({ inviteCode }: InviteCardProps): ReactElement {
  const link = `${window.location.origin}/onboarding?code=${inviteCode}`;
  const message = `${labels.settings.inviteMessage} ${link}`;

  return (
    <Card title={labels.sections.invite}>
      <p className="text-sm text-muted">{labels.settings.inviteHint}</p>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-medium text-white"
      >
        {labels.settings.shareInvite}
      </a>
      <p className="text-sm text-muted">{labels.settings.inviteCodeLabel}</p>
      <code dir="ltr" className="rounded-xl bg-paper px-3 py-2.5 text-center text-sm select-all">
        {inviteCode}
      </code>
    </Card>
  );
}
