import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { EntityStripLink } from './EntityStripLink';

type EntityStripProps = {
  readonly entities: readonly Entity[];
  /** Open rows per entity id. */
  readonly counts: ReadonlyMap<string, number>;
  /** The entity whose page is open; undefined on the main page. */
  readonly currentId?: string | undefined;
};

/**
 * One scrolling line: the main page, then an icon for each entity that opens its page.
 * The open one is raised and kept in view.
 */
export function EntityStrip({ entities, counts, currentId }: EntityStripProps): ReactElement {
  const onEntityPage = currentId !== undefined;

  return (
    <nav
      aria-label={labels.sections.entities}
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pt-2 pb-1 [scrollbar-width:none]"
    >
      <EntityStripLink
        to="/"
        label={labels.entityPage.main}
        toneClass="bg-primary"
        current={!onEntityPage}
        count={0}
        replace={onEntityPage}
      >
        <Icon name="home" className="size-6" />
      </EntityStripLink>
      {entities.map((entity, index) => (
        <EntityStripLink
          key={entity.id}
          to={`/entity/${entity.id}`}
          label={entity.name}
          toneClass={entityTone(index)}
          current={entity.id === currentId}
          count={counts.get(entity.id) ?? 0}
          replace={onEntityPage}
        >
          {entity.kind === 'personal' ? (
            <Icon name="lock" className="size-6" />
          ) : (
            entity.name.trim().charAt(0)
          )}
        </EntityStripLink>
      ))}
    </nav>
  );
}
