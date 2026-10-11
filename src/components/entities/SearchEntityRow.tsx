import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { EntityHit } from '../../hooks/useSearch';
import type { EntityTone } from '../../lib/lookups';
import { EntityAvatar } from '../entities/EntityAvatar';
import { Icon } from '../ui/Icon';

type SearchEntityRowProps = {
  readonly hit: EntityHit;
  readonly tone: EntityTone;
};

/** An entity found by a search, with what matched in its profile; opens its page. */
export function SearchEntityRow({ hit, tone }: SearchEntityRowProps): ReactElement {
  return (
    <li className="group">
      <Link
        to={`/entity/${hit.entity.id}`}
        className="flex items-center gap-3 ps-3.5 active:bg-paper"
      >
        <EntityAvatar entity={hit.entity} tone={tone} size="md" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-t border-line py-2.5 pe-3.5 group-first:border-t-0">
          <span className="text-[15px] font-medium">{hit.entity.name}</span>
          <span className="text-xs text-muted">{labels.entityKind[hit.entity.kind]}</span>
          {hit.matches.map((match) => (
            <span key={match} className="truncate text-[13px] text-ink/80">
              {match}
            </span>
          ))}
        </span>
        <Icon name="forward" className="me-3.5 size-4 text-faint" />
      </Link>
    </li>
  );
}
