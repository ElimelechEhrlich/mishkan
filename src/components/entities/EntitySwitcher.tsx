import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityAvatar } from './EntityAvatar';

type EntitySwitcherProps = {
  readonly entities: readonly Entity[];
  /** The entity whose page is open. */
  readonly currentId: string | undefined;
  /** Leaving for the main page shows everything again. */
  readonly onMain: () => void;
};

/**
 * Small circles to move between entity pages: the main page first, then every entity.
 * The open one is ringed and kept in view; moving replaces the history entry,
 * so "back" returns to the main page.
 */
export function EntitySwitcher({
  entities,
  currentId,
  onMain,
}: EntitySwitcherProps): ReactElement {
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentId]);

  return (
    <nav
      aria-label={labels.sections.entities}
      className="-mx-4 flex gap-2.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none]"
    >
      <Link
        to="/"
        replace
        onClick={onMain}
        aria-label={labels.entityPage.main}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white opacity-60 transition active:scale-90"
      >
        <Icon name="home" className="size-4.5" />
      </Link>
      {entities.map((entity, index) => {
        const current = entity.id === currentId;
        return (
          <Link
            key={entity.id}
            ref={current ? currentRef : undefined}
            to={`/entity/${entity.id}`}
            replace
            aria-label={entity.name}
            aria-current={current ? 'page' : undefined}
            className={`shrink-0 rounded-full transition duration-300 active:scale-90 ${
              current ? 'ring-2 ring-primary ring-offset-2 ring-offset-paper' : 'opacity-45'
            }`}
          >
            <EntityAvatar entity={entity} tone={entityTone(index)} size="md" />
          </Link>
        );
      })}
    </nav>
  );
}
