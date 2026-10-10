import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { areaTone } from '../../lib/lookups';
import type { AreaWithDomains, Visibility } from '../../types/domain';
import { Chip } from '../ui/Chip';

type DomainPickerProps = {
  readonly areas: readonly AreaWithDomains[];
  readonly value: string | null;
  readonly onChange: (domainId: string | null) => void;
};

function privateNote(visibility: Visibility): string | undefined {
  return visibility === 'private' ? labels.capture.privateMark : undefined;
}

/** Two taps: an area, then one of its domains. Tapping the selected domain clears it. */
export function DomainPicker({ areas, value, onChange }: DomainPickerProps): ReactElement {
  const currentAreaId =
    areas.find((area) => area.domains.some((domain) => domain.id === value))?.id ?? null;
  const [areaId, setAreaId] = useState<string | null>(currentAreaId);
  const openArea = areas.find((area) => area.id === areaId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">{labels.capture.area}</span>
        <div className="flex flex-wrap gap-2">
          {areas.map((area, index) => (
            <Chip
              key={area.id}
              label={area.name}
              note={privateNote(area.visibility)}
              dotClass={area.id === areaId ? undefined : areaTone(index)}
              selected={area.id === areaId}
              onClick={() => {
                setAreaId(area.id === areaId ? null : area.id);
              }}
            />
          ))}
        </div>
      </div>
      {openArea !== undefined && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">{labels.capture.domain}</span>
          <div className="flex flex-wrap gap-2">
            {openArea.domains.map((domain) => (
              <Chip
                key={domain.id}
                label={domain.name}
                note={openArea.visibility === 'private' ? undefined : privateNote(domain.visibility)}
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
