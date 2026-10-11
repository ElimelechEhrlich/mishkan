import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { Entity } from '../../types/domain';
import { Chip } from '../ui/Chip';

type EntityFilterProps = {
  readonly entities: readonly Entity[];
  readonly value: string | null;
  readonly onChange: (entityId: string | null) => void;
};

/** One scrolling line of chips: everything, then each entity. */
export function EntityFilter({ entities, value, onChange }: EntityFilterProps): ReactElement {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <span className="shrink-0">
        <Chip
          label={labels.filter.all}
          selected={value === null}
          onClick={() => {
            onChange(null);
          }}
        />
      </span>
      {entities.map((entity, index) => (
        <span key={entity.id} className="shrink-0">
          <Chip
            label={entity.name}
            dotClass={entity.id === value ? undefined : entityTone(index)}
            selected={entity.id === value}
            onClick={() => {
              onChange(entity.id);
            }}
          />
        </span>
      ))}
    </div>
  );
}
