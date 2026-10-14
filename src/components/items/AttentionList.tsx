import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';

type AttentionListProps = {
  /** Items that need a look, each with why. They stay in the lists as well. */
  readonly entries: readonly { readonly item: Item; readonly reason: string }[];
};

/** "For your attention": items that are fully assigned but have something waiting on them. */
export function AttentionList({ entries }: AttentionListProps): ReactElement | null {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
        {labels.reminders.attentionTitle}
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {entries.map(({ item, reason }) => (
          <li key={item.id} className="border-t border-line first:border-t-0">
            <Link to={`/item/${item.id}`} className="flex min-w-0 flex-col px-3.5 py-2.5">
              <span className="text-[15px] font-medium break-words">{item.title}</span>
              <span className="text-xs text-alert">
                {labels.kind[item.kind]}
                {labels.item.separator}
                {reason}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="px-1 text-[13px] text-muted">{labels.reminders.attentionHint}</p>
    </section>
  );
}
