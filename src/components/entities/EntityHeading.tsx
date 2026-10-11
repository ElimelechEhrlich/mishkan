import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { EntityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { EntityAvatar } from './EntityAvatar';

type EntityHeadingProps = {
  readonly entity: Entity;
  readonly tone: EntityTone;
  readonly openCount: number;
};

/** The top of an entity's page: its icon, name, kind and how many items are open. */
export function EntityHeading({ entity, tone, openCount }: EntityHeadingProps): ReactElement {
  return (
    <div className="flex items-center gap-3.5">
      <EntityAvatar entity={entity} tone={tone} size="lg" />
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate font-display text-[26px] leading-8 font-bold tracking-tight">
          {entity.name}
        </h1>
        <p className="text-[13px] text-muted">
          {labels.entityKind[entity.kind]}
          {labels.item.separator}
          {String(openCount)} {labels.entityPage.openItems}
        </p>
      </div>
    </div>
  );
}
