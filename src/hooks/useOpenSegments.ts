import { useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import { segmentOf } from '../lib/itemRules';
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
  readonly memberFilter: string | null;
  readonly setMemberFilter: (memberId: string | null) => void;
  /** The tabs, each with the number of items it holds under the member filter. */
  readonly options: readonly SegmentOption[];
  /** The items of the selected tab under the member filter. */
  readonly visible: readonly Item[];
};

/** The tab and member filter of the open-items page, and the items they leave visible. */
export function useOpenSegments(items: readonly Item[]): UseOpenSegments {
  const [segment, setSegment] = useState<OpenSegment>('active');
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () => items.filter((item) => memberFilter === null || item.member_id === memberFilter),
    [items, memberFilter],
  );

  const options = segments.map((value) => ({
    value,
    label: labels.segment[value],
    count: filtered.filter((item) => segmentOf(item) === value).length,
  }));

  const visible = filtered.filter((item) => segmentOf(item) === segment);

  return { segment, setSegment, memberFilter, setMemberFilter, options, visible };
}
