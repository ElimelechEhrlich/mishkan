import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseSearch } from '../../hooks/useSearch';
import { entityTone } from '../../lib/lookups';
import type { Lookups } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { EmptyState } from '../ui/EmptyState';
import { SearchEntityRow } from '../entities/SearchEntityRow';
import { SearchItemRow } from './SearchItemRow';

type SearchResultsProps = {
  readonly search: UseSearch;
  readonly entities: readonly EntityWithDomains[];
  readonly lookups: Lookups;
};

const cardClass = 'overflow-hidden rounded-2xl bg-surface shadow-card';

/** What a search found: entities and their profiles first, then items of every status. */
export function SearchResults({ search, entities, lookups }: SearchResultsProps): ReactElement {
  if (!search.searched) {
    return <EmptyState text={labels.search.hint} />;
  }
  if (search.entityHits.length === 0 && search.items.length === 0) {
    return <EmptyState text={search.loading ? labels.status.loading : labels.search.nothing} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {search.entityHits.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
            {labels.search.entities}
          </h2>
          <ul className={cardClass}>
            {search.entityHits.map((hit) => (
              <SearchEntityRow
                key={hit.entity.id}
                hit={hit}
                tone={entityTone(entities.indexOf(hit.entity))}
              />
            ))}
          </ul>
        </section>
      )}
      {search.items.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
            {labels.search.items} {String(search.items.length)}
          </h2>
          <ul className={cardClass}>
            {search.items.map((item) => (
              <SearchItemRow key={item.id} item={item} lookups={lookups} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
