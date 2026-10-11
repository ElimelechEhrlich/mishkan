import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { entityTone } from '../../lib/lookups';
import type { EntityWithDomains } from '../../types/domain';
import { Chip } from '../ui/Chip';

type DomainPickerProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly value: string | null;
  readonly onChange: (domainId: string | null) => void;
};

/** Two taps: an entity, then one of its domains. Tapping the selected domain clears it. */
export function DomainPicker({ entities, value, onChange }: DomainPickerProps): ReactElement {
  const currentEntityId =
    entities.find((entity) => entity.domains.some((domain) => domain.id === value))?.id ?? null;
  const [entityId, setEntityId] = useState<string | null>(currentEntityId);
  const openEntity = entities.find((entity) => entity.id === entityId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">{labels.capture.entity}</span>
        <div className="flex flex-wrap gap-2">
          {entities.map((entity, index) => (
            <Chip
              key={entity.id}
              label={entity.name}
              note={entity.kind === 'personal' ? labels.capture.privateMark : undefined}
              dotClass={entity.id === entityId ? undefined : entityTone(index)}
              selected={entity.id === entityId}
              onClick={() => {
                setEntityId(entity.id === entityId ? null : entity.id);
              }}
            />
          ))}
        </div>
      </div>
      {openEntity !== undefined && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">{labels.capture.domain}</span>
          <div className="flex flex-wrap gap-2">
            {openEntity.domains.map((domain) => (
              <Chip
                key={domain.id}
                label={domain.name}
                selected={domain.id === value}
                onClick={() => {
                  onChange(domain.id === value ? null : domain.id);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
