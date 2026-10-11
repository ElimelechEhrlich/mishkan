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
  readonly entityFilter: string | null;
  readonly setEntityFilter: (entityId: string | null) => void;
  /** The tabs, each with the number of items it holds under the entity filter. */
  readonly options: readonly SegmentOption[];
  /** The items of the selected tab under the entity filter. */
  readonly visible: readonly Item[];
};

/**
 * The tab and entity filter of the open-items page, and the items they leave visible.
 * `domainEntities` maps a domain id to the id of its entity.
 */
export function useOpenSegments(
  items: readonly Item[],
  domainEntities: ReadonlyMap<string, string>,
): UseOpenSegments {
  const [segment, setSegment] = useState<OpenSegment>('active');
  const [entityFilter, setEntityFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          entityFilter === null ||
          (item.domain_id !== null && domainEntities.get(item.domain_id) === entityFilter),
      ),
    [items, domainEntities, entityFilter],
  );

  const options = segments.map((value) => ({
    value,
    label: labels.segment[value],
    count: filtered.filter((item) => segmentOf(item) === value).length,
  }));

  const visible = filtered.filter((item) => segmentOf(item) === segment);

  return { segment, setSegment, entityFilter, setEntityFilter, options, visible };
}
