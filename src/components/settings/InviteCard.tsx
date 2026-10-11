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
      <p className="text-[13px] leading-5 text-muted">{labels.settings.inviteHint}</p>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-[15px] font-semibold text-white transition active:scale-[0.98]"
      >
        {labels.settings.shareInvite}
      </a>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted">{labels.settings.inviteCodeLabel}</p>
        <code
          dir="ltr"
          className="rounded-lg bg-paper px-3 py-2 text-center font-mono text-xs text-muted select-all"
        >
          {inviteCode}
        </code>
      </div>
    </Card>
  );
}
