import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { DomainSection } from '../../hooks/useEntityPage';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { ItemList } from '../items/ItemList';
import { SkeletonList } from '../ui/SkeletonList';

type DomainSectionListProps = {
  readonly sections: readonly DomainSection[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
};

/** The domains of one entity, each with its open items. Empty domains are listed at the end. */
export function DomainSectionList({
  sections,
  lookups,
  loading,
  onComplete,
}: DomainSectionListProps): ReactElement {
  if (loading && sections.every((section) => section.entries.length === 0)) {
    return <SkeletonList />;
  }

  const filled = sections.filter((section) => section.entries.length > 0);
  const empty = sections.filter((section) => section.entries.length === 0);

  return (
    <div className="flex flex-col gap-6">
      {filled.map((section) => (
        <section key={section.domain.id} className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 px-1">
            <span className="font-display text-lg font-bold">{section.domain.name}</span>
            <span className="rounded-full bg-line/70 px-2 text-xs leading-5 font-bold text-muted">
              {String(section.entries.length)}
            </span>
            <span className="h-px flex-1 bg-line" />
          </h2>
          <ItemList
            entries={section.entries}
            lookups={lookups}
            grouped={false}
            loading={false}
            onComplete={onComplete}
          />
        </section>
      ))}
      {empty.length > 0 && (
        <p className="px-1 text-sm text-muted">
          {labels.entityPage.emptyDomains}{' '}
          {empty.map((section) => section.domain.name).join(labels.item.separator)}
        </p>
      )}
    </div>
  );
}
