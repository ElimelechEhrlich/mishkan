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
};

/** A goal or issue with steps holds them inside it; anything else is a plain row. */
export function EntryRow({ entry, lookups, today, onComplete }: EntryRowProps): ReactElement {
  if (entry.steps.length > 0) {
    return (
      <GoalRow
        goal={entry.item}
        steps={entry.steps}
        lookups={lookups}
        today={today}
        onComplete={onComplete}
      />
    );
  }
  return <ItemRow item={entry.item} lookups={lookups} today={today} onComplete={onComplete} />;
}
