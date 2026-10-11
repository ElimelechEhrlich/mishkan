import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useAutoReminderRecipients } from '../../hooks/useAutoReminderRecipients';
import { useReminderPeople } from '../../hooks/useReminderPeople';
import type { Household, Member } from '../../types/domain';
import { RecipientChips } from '../items/RecipientChips';
import { ErrorBanner } from '../ui/ErrorBanner';

type AutoReminderCardProps = {
  readonly household: Household;
  readonly members: readonly Member[];
};

/** Who gets the automatic reminders of Hebrew birthdays and the wedding anniversary. */
export function AutoReminderCard({ household, members }: AutoReminderCardProps): ReactElement {
  const people = useReminderPeople(members);
  const recipients = useAutoReminderRecipients(household);

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">{labels.push.autoTitle}</h2>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-[13px] leading-5 text-muted">{labels.push.autoHint}</p>
        <RecipientChips
          people={people.people}
          value={recipients.memberIds}
          onChange={recipients.choose}
          disabled={recipients.busy}
        />
        <ErrorBanner message={recipients.error ?? people.error} />
      </div>
    </section>
  );
}
