import type { ReactElement } from 'react';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { GoalRow } from './GoalRow';
import { ItemRow } from './ItemRow';

type EntryRowProps = {
  readonly entry: ListEntry;
  readonly lookups: Lookups;
  readonly today: string;
  readonly onComplete: (item: Item) => void;
  /** Leaves out the domain, on a page that already groups by it. */
  readonly hideDomain: boolean;
};

/** A goal or issue with steps holds them inside it; anything else is a plain row. */
export function EntryRow({
  entry,
  lookups,
  today,
  onComplete,
  hideDomain,
}: EntryRowProps): ReactElement {
  if (entry.steps.length > 0 || entry.heading === true) {
    return (
      <GoalRow
        goal={entry.item}
        steps={entry.steps}
        shown={entry.shown}
        heading={entry.heading === true}
        lookups={lookups}
        today={today}
        onComplete={onComplete}
        hideDomain={hideDomain}
      />
    );
  }
  return (
    <ItemRow
      item={entry.item}
      parent={entry.parent}
      lookups={lookups}
      today={today}
      onComplete={onComplete}
      hideDomain={hideDomain}
    />
  );
}
