import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';

type EntityChipsProps = {
  readonly entities: readonly Entity[];
  /** Open rows per entity id. */
  readonly counts: ReadonlyMap<string, number>;
  /** All open rows, shown on the "everything" chip. */
  readonly total: number;
};

/** The top of the main page: everything (this page), then a chip per entity that opens its page. */
export function EntityChips({ entities, counts, total }: EntityChipsProps): ReactElement {
  return (
    <nav
      aria-label={labels.sections.entities}
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none]"
    >
      <span
        aria-current="page"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary ps-1 pe-3 text-[13px] font-medium text-white"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
          <Icon name="home" className="size-3.5" />
        </span>
        {labels.entityPage.everything}
        <span className="text-xs text-white/70">{String(total)}</span>
      </span>
      {entities.map((entity, index) => {
        const count = counts.get(entity.id) ?? 0;
        return (
          <Link
            key={entity.id}
            to={`/entity/${entity.id}`}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-surface ps-1 pe-3 text-[13px] font-medium shadow-card transition active:scale-95"
          >
            <EntityAvatar entity={entity} tone={entityTone(index)} size="xs" />
            {entity.name}
            {count > 0 && <span className="text-xs text-muted">{String(count)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
