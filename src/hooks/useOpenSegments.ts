import { useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import { segmentOf, toListEntries, withoutNestedSteps } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Item, OpenSegment } from '../types/domain';

const segments = ['active', 'waiting', 'someday', 'notes'] as const satisfies readonly OpenSegment[];

type SegmentOption = {
  readonly value: OpenSegment;
  readonly label: string;
  readonly count: number;
};

export type UseOpenSegments = {
  readonly segment: OpenSegment;
  readonly setSegment: (segment: OpenSegment) => void;
  /** The tabs, each with the number of rows it holds. */
  readonly options: readonly SegmentOption[];
  /** The rows of the selected tab. A step whose goal is listed is shown inside the goal. */
  readonly visible: readonly ListEntry[];
};

/** The tab of the open-items page, and the rows it leaves visible. */
export function useOpenSegments(
  items: readonly Item[],
  steps: readonly Item[],
): UseOpenSegments {
  const [segment, setSegment] = useState<OpenSegment>('active');

  const rows = useMemo(() => withoutNestedSteps(items), [items]);

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

  return { segment, setSegment, options, visible };
}
