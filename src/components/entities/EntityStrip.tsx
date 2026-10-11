import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';

type EntityStripProps = {
  readonly entities: readonly Entity[];
  /** Open rows per entity id. */
  readonly counts: ReadonlyMap<string, number>;
  /** The entity whose page is open, marked in the strip. */
  readonly currentId?: string | undefined;
};

/** One scrolling line of entity icons; each opens that entity's page. */
export function EntityStrip({ entities, counts, currentId }: EntityStripProps): ReactElement {
  return (
    <nav
      aria-label={labels.sections.entities}
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
    >
      {entities.map((entity, index) => {
        const current = entity.id === currentId;
        const count = counts.get(entity.id) ?? 0;
        return (
          <Link
            key={entity.id}
            to={`/entity/${entity.id}`}
            aria-current={current ? 'page' : undefined}
            className="flex w-16 shrink-0 flex-col items-center gap-1 transition active:scale-95"
          >
            <span
              className={`relative flex size-13 items-center justify-center rounded-2xl font-display text-xl font-bold text-white shadow-card ${entityTone(index)} ${
                current ? 'ring-3 ring-primary ring-offset-2 ring-offset-paper' : ''
              }`}
            >
              {entity.kind === 'personal' ? (
                <Icon name="lock" className="size-6" />
              ) : (
                entity.name.trim().charAt(0)
              )}
              {count > 0 && (
                <span className="absolute -end-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-surface px-1 text-[11px] leading-5 font-bold text-ink shadow-card">
                  {String(count)}
                </span>
              )}
            </span>
            <span
              className={`w-full truncate text-center text-xs ${current ? 'font-bold text-ink' : 'text-muted'}`}
            >
              {entity.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
