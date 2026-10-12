import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ListEntry } from '../../lib/itemRules';
import type { Lookups, TopicGroup } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonList } from '../ui/SkeletonList';
import { TopicSection } from './TopicSection';

type TopicSectionListProps = {
  readonly sections: readonly TopicGroup<ListEntry>[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** Shown when there is nothing to list. */
  readonly emptyText?: string;
};

/** Every topic that has open items, each a card that folds; empty topics are left out. */
export function TopicSectionList({
  sections,
  lookups,
  loading,
  onComplete,
  emptyText = labels.status.emptySegment,
}: TopicSectionListProps): ReactElement {
  if (sections.length === 0) {
    return loading ? <SkeletonList /> : <EmptyState text={emptyText} />;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {sections.map((section) => (
        <TopicSection
          // A lone section (one domain chosen) opens, even if it was folded among the others.
          key={`${section.topic}-${sections.length === 1 ? 'alone' : 'among'}`}
          topic={section.topic}
          entries={section.rows}
          lookups={lookups}
          onComplete={onComplete}
          defaultOpen={sections.length === 1}
        />
      ))}
    </div>
  );
}
