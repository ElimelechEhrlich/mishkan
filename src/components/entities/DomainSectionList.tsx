import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { DomainSection } from '../../hooks/useEntitySections';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { ItemList } from '../items/ItemList';
import { Icon } from '../ui/Icon';
import { SkeletonList } from '../ui/SkeletonList';

type DomainSectionListProps = {
  readonly sections: readonly DomainSection[];
  readonly lookups: Lookups;
  readonly loading: boolean;
  readonly onComplete: (item: Item) => void;
  /** Opens the add sheet on a domain. */
  readonly onAdd: (domainId: string) => void;
};

/**
 * The domains of one entity, each with its open items and a button to add to it.
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
    <div className="flex flex-col gap-5">
      {filled.map((section) => (
        <section key={section.domain.id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-baseline gap-1.5">
              <span className="font-display text-base font-semibold">{section.domain.name}</span>
              <span className="text-xs font-medium text-faint">
                {String(section.entries.length)}
              </span>
            </h2>
            <button
              type="button"
              aria-label={`${labels.entityPage.addTo} ${section.domain.name}`}
              onClick={() => {
                onAdd(section.domain.id);
              }}
              className="flex size-7 items-center justify-center rounded-lg bg-surface text-muted shadow-card transition active:scale-90"
            >
              <Icon name="plus" className="size-4" />
            </button>
          </div>
          <ItemList
            entries={section.entries}
            lookups={lookups}
            grouped={false}
            loading={false}
            onComplete={onComplete}
            hideDomain
          />
        </section>
      ))}
      {empty.length > 0 && (
        <div className="flex flex-col gap-2 px-1">
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
