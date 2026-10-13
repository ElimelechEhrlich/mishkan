import { useCallback, useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import {
  activeSectionOf,
  segmentOf,
  todayIso,
  toListEntries,
  withoutNestedSteps,
} from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Item, KindFilter, OpenSegment } from '../types/domain';

const segments = ['active', 'waiting', 'someday'] as const satisfies readonly OpenSegment[];

type SegmentOption = {
  readonly value: OpenSegment;
  readonly label: string;
  readonly count: number;
};

export type UseOpenSegments = {
  /** Whether every kind that runs on time is shown, rather than only `narrowKind`. */
  readonly allKinds: boolean;
  readonly toggleAllKinds: () => void;
  readonly segment: OpenSegment;
  readonly setSegment: (segment: OpenSegment) => void;
  /** The time tabs, each with the number of rows it holds. */
  readonly options: readonly SegmentOption[];
  /** The rows of the selected tab. A step whose goal is listed is shown inside the goal. */
  readonly visible: readonly ListEntry[];
  /** Active rows that are late, and due today, counting a goal by its earliest open step. */
  readonly overdueCount: number;
  readonly todayCount: number;
};

function matchesKind(item: Item, kind: KindFilter): boolean {
  return kind === 'all' || item.kind === kind;
}

/**
 * The time tab (active, waiting, someday) of a list of items that run on time,
 * and the rows it leaves visible. Each page keeps its own tab.
 */
export function useOpenSegments(
  items: readonly Item[],
  steps: readonly Item[],
  narrowKind: KindFilter = 'all',
): UseOpenSegments {
  // Every kind shows at first; the toggle narrows to one kind and back.
  const [kind, setKind] = useState<KindFilter>('all');
  const toggleAllKinds = useCallback((): void => {
    setKind((current) => (current === 'all' ? narrowKind : 'all'));
  }, [narrowKind]);
  const [segment, setSegment] = useState<OpenSegment>('active');

  const rows = useMemo(
    () => withoutNestedSteps(items).filter((item) => matchesKind(item, kind)),
    [items, kind],
  );

  const options = segments.map((value) => ({
    value,
    label: labels.segment[value],
    count: rows.filter((item) => segmentOf(item) === value).length,
  }));

  const visible = useMemo(
    () =>
      toListEntries(
        rows.filter((item) => segmentOf(item) === segment),
        steps,
      ),
    [rows, steps, segment],
  );

  const sectionCounts = useMemo(() => {
    const today = todayIso();
    const active = toListEntries(
      rows.filter((item) => segmentOf(item) === 'active'),
      steps,
    );
    return {
      overdue: active.filter(
        (entry) => activeSectionOf(entry.dueDate, today, entry.urgent) === 'overdue',
      ).length,
      today: active.filter(
        (entry) => activeSectionOf(entry.dueDate, today, entry.urgent) === 'today',
      ).length,
    };
  }, [rows, steps]);

  return {
    allKinds: kind === 'all',
    toggleAllKinds,
    segment,
    setSegment,
    options,
    visible,
    overdueCount: sectionCounts.overdue,
    todayCount: sectionCounts.today,
  };
}
