import { useCallback, useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import { todayIso } from '../lib/itemRules';
import type { Timeline } from '../lib/itemRules';
import { looseGroups, stillRelevant } from '../lib/todayBrief';
import type { FocusRow, LooseGroup, StillRelevant } from '../lib/todayBrief';
import { listOpenPrerequisites } from '../services/prerequisiteService';
import type { Item, ItemUpdate } from '../types/domain';

/** What "עוד רלוונטי?" can answer. A date is set on the item's page. */
export type ReviewAnswer = 'today' | 'keep' | 'shelf' | 'back' | 'close';

export type UseLooseItems = {
  readonly groups: Record<LooseGroup, readonly FocusRow[]>;
  /** For each waiting item, what it waits for. */
  readonly reasons: ReadonlyMap<string, string>;
  /** The item to ask "עוד רלוונטי?" about, if any. */
  readonly relevant: StillRelevant | null;
  readonly answer: (item: Item, answer: ReviewAnswer) => void;
  /** Leaves the question for today, on this device; the item comes up again tomorrow. */
  readonly putAside: (itemId: string) => void;
  readonly error: string | null;
};

const putAsideKey = 'mishkan.stillRelevantPutAside';

/** The items put aside today, kept on this device as "day:id,id". */
function readPutAside(today: string): ReadonlySet<string> {
  try {
    const [day, ids] = (window.localStorage.getItem(putAsideKey) ?? '').split(':');
    return day === today && ids !== undefined && ids !== '' ? new Set(ids.split(',')) : new Set();
  } catch {
    return new Set();
  }
}

function writePutAside(today: string, ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(putAsideKey, `${today}:${[...ids].join(',')}`);
  } catch {
    // Private mode: it is put aside until the app is closed.
  }
}

/**
 * The home page's second card: what has no date, waits, or is on the shelf, and the one item
 * asked about today. Every answer marks the item looked at, so the next one comes up.
 */
export function useLooseItems(
  timeline: Pick<Timeline, LooseGroup>,
  items: readonly Item[],
  update: (itemId: string, changes: ItemUpdate) => void,
  complete: (item: Item) => void,
): UseLooseItems {
  const today = todayIso();
  const groups = useMemo(() => looseGroups(timeline), [timeline]);
  const [putAsideIds, setPutAsideIds] = useState(() => readPutAside(today));
  const [reasons, setReasons] = useState<ReadonlyMap<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const waitingIds = groups.waiting.map((row) => row.item.id).join(',');

  useEffect(() => {
    let current = true;
    listOpenPrerequisites(waitingIds === '' ? [] : waitingIds.split(','))
      .then((prerequisites) => {
        if (!current) {
          return;
        }
        const titles = new Map(items.map((item) => [item.id, item.title]));
        const found = new Map<string, string>();
        for (const prerequisite of prerequisites) {
          const what =
            prerequisite.description ??
            (prerequisite.depends_on_item_id === null
              ? null
              : (titles.get(prerequisite.depends_on_item_id) ?? null));
          if (what !== null && !found.has(prerequisite.item_id)) {
            found.set(prerequisite.item_id, what);
          }
        }
        setReasons(found);
      })
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      });
    return (): void => {
      current = false;
    };
  }, [waitingIds, items]);

  const relevant = useMemo(
    () => stillRelevant(groups, today, putAsideIds),
    [groups, today, putAsideIds],
  );

  const answer = useCallback(
    (item: Item, choice: ReviewAnswer): void => {
      const reviewed_at = new Date().toISOString();
      if (choice === 'close') {
        complete(item);
        return;
      }
      const changes: ItemUpdate =
        choice === 'today'
          ? { time_mode: 'scheduled', due_date: todayIso(), reviewed_at }
          : choice === 'shelf'
            ? { time_mode: 'someday', reviewed_at }
            : choice === 'back'
              ? { time_mode: 'anytime', reviewed_at }
              : { reviewed_at };
      update(item.id, changes);
    },
    [update, complete],
  );

  const putAside = useCallback(
    (itemId: string): void => {
      const next = new Set(putAsideIds).add(itemId);
      writePutAside(today, next);
      setPutAsideIds(next);
    },
    [putAsideIds, today],
  );

  return { groups, reasons, relevant, answer, putAside, error };
}
