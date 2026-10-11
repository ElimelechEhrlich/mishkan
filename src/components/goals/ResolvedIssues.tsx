import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { DoneRow } from '../items/DoneRow';

type ResolvedIssuesProps = {
  readonly issues: readonly Item[];
  readonly lookups: Lookups;
  readonly onReopen: (itemId: string) => void;
};

/** Resolved issues stay here for reference, with their answers and steps on their pages. */
export function ResolvedIssues({ issues, lookups, onReopen }: ResolvedIssuesProps): ReactElement | null {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 pt-2 text-[13px] font-bold tracking-wide text-muted">
        {labels.goals.resolved}
      </h2>
      <ul className="flex flex-col gap-2">
        {issues.map((issue) => (
          <DoneRow key={issue.id} item={issue} lookups={lookups} onReopen={onReopen} />
        ))}
      </ul>
    </section>
  );
}
