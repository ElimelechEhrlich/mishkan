import type { ReactElement } from "react";
import { labels } from "../../constants/labels";
import { useCopyText } from "../../hooks/useCopyText";
import { Icon } from "../ui/Icon";
import { ListRow } from "../ui/ListRow";

type InviteCardProps = {
  readonly inviteCode: string;
};

/** Sends the second parent a link that opens the app ready to join this household. */
export function InviteCard({ inviteCode }: InviteCardProps): ReactElement {
  const link = `${window.location.origin}/signup?code=${inviteCode}`;
  const message = `${labels.settings.inviteMessage} ${link}`;
  const { copied, copy } = useCopyText();

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
        {labels.sections.invite}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="block active:bg-paper"
        >
          <ListRow
            icon="share"
            iconClass="bg-primary text-white"
            title={labels.settings.shareInvite}
            subtitle={labels.settings.inviteShort}
            trailing={<Icon name="forward" className="size-4 text-faint" />}
          />
        </a>
        <ListRow
          icon="copy"
          iconClass="bg-line text-muted"
          title={copied ? labels.settings.copied : labels.settings.copyCode}
          subtitle={inviteCode}
          onClick={() => {
            copy(inviteCode);
          }}
        />
      </div>
      <p className="px-1 text-xs leading-5 text-muted">
        {labels.settings.inviteHint}
      </p>
    </section>
  );
}
