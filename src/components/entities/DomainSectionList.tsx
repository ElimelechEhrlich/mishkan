import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { DomainSection } from '../../hooks/useEntitySections';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { SkeletonList } from '../ui/SkeletonList';
import { TopicSection } from './TopicSection';

type DomainSectionListProps = {
  readonly sections: readonly DomainSection[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** Opens the add sheet on a domain. */
  readonly onAdd: (domainId: string) => void;
};

/**
 * The domains of one entity, each a card that folds, with its open items and a "+" to add to it.
 * Empty domains are gathered at the end as chips that add to them.
 */
export function DomainSectionList({
  sections,
  lookups,
  loading,
  onComplete,
  onAdd,
}: DomainSectionListProps): ReactElement {
  if (loading && sections.every((section) => section.entries.length === 0)) {
    return <SkeletonList />;
  }

  const filled = sections.filter((section) => section.entries.length > 0);
  const empty = sections.filter((section) => section.entries.length === 0);

  return (
    <div className="flex flex-col gap-2.5">
      {filled.map((section) => (
        <TopicSection
          // A lone section (one domain chosen) opens, even if it was folded among the others.
          key={`${section.domain.id}-${filled.length === 1 ? 'alone' : 'among'}`}
          topic={section.domain.name}
          entries={section.entries}
          lookups={lookups}
          onComplete={onComplete}
          defaultOpen={filled.length === 1}
          hideDomain
          addLabel={`${labels.entityPage.addTo} ${section.domain.name}`}
          onAdd={() => {
            onAdd(section.domain.id);
          }}
        />
      ))}
      {empty.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-2 px-1">
          {filled.length > 0 && (
            <span className="text-xs font-bold tracking-wide text-muted">
              {labels.entityPage.emptyDomains}
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {empty.map((section) => (
              <button
                key={section.domain.id}
                type="button"
                onClick={() => {
                  onAdd(section.domain.id);
                }}
                className="flex h-8 items-center gap-1 rounded-full border border-dashed border-faint px-3 text-[13px] text-muted transition active:scale-95"
              >
                <Icon name="plus" className="size-3.5" />
                {section.domain.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
