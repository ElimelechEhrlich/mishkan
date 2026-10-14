import { useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listDoneSince, listRecurringDone } from '../services/itemService';
import type { Item, Member } from '../types/domain';

export type WeekSummary = {
  /** Items closed in the last seven days, within the chosen entity. */
  readonly doneCount: number;
  /** Who marked them, most first. */
  readonly byMember: readonly { readonly name: string; readonly count: number }[];
  readonly loading: boolean;
  readonly error: string | null;
};

const weekMs = 7 * 24 * 60 * 60 * 1000;

/**
 * What was done in the last week, narrowed by `inScope` (the chosen entity).
 * Loads again whenever `openItems` changes, so marking an item done counts at once.
 */
export function useWeekSummary(
  inScope: (item: Item) => boolean,
  members: readonly Member[],
  openItems: readonly Item[],
): WeekSummary {
  const [state, setState] = useState<{
    readonly items: readonly Item[];
    readonly loading: boolean;
    readonly error: string | null;
  }>({ items: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - weekMs).toISOString();
    // Each time a recurring task was done counts too.
    Promise.all([listDoneSince(since), listRecurringDone({ since })])
      .then(([closed, repeated]) => [...closed, ...repeated])
      .then((items) => {
        if (active) {
          setState({ items, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ items: [], loading: false, error: toMessage(error) });
        }
      });
    return (): void => {
      active = false;
    };
  }, [openItems]);

  return useMemo(() => {
    const done = state.items.filter(inScope);
    const counts = new Map<string, number>();
    for (const item of done) {
      if (item.completed_by !== null) {
        counts.set(item.completed_by, (counts.get(item.completed_by) ?? 0) + 1);
      }
    }
    const byMember = members
      .filter((member) => counts.has(member.id))
      .map((member) => ({ name: member.name, count: counts.get(member.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
    return { doneCount: done.length, byMember, loading: state.loading, error: state.error };
  }, [state, inScope, members]);
}
