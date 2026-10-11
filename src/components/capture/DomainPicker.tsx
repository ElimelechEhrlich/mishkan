import { useState } from "react";
import type { ReactElement } from "react";
import { labels } from "../../constants/labels";
import { entityTone } from "../../lib/lookups";
import type { EntityWithDomains } from "../../types/domain";
import { Chip } from "../ui/Chip";
import { InlineAddChip } from "../ui/InlineAddChip";

type DomainPickerProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly value: string | null;
  readonly onChange: (domainId: string | null) => void;
  /** The entity opened at first when no domain is chosen yet. */
  readonly initialEntityId?: string | undefined;
  /** Adds a domain to an entity; resolves to its id, or null when it failed. Without it, no adding. */
  readonly onAddDomain?: (
    entity: EntityWithDomains,
    name: string,
  ) => Promise<string | null>;
  /** Adds a child; resolves to its id, or null when it failed. Without it, no adding. */
  readonly onAddChild?: (name: string) => Promise<string | null>;
};

/**
 * Two taps: an entity, then one of its domains. Tapping the selected domain clears it.
 * A missing child or domain can be added on the spot; it is chosen right away.
 */
export function DomainPicker({
  entities,
  value,
  onChange,
  initialEntityId,
  onAddDomain,
  onAddChild,
}: DomainPickerProps): ReactElement {
  const currentEntityId =
    entities.find((entity) =>
      entity.domains.some((domain) => domain.id === value),
    )?.id ??
    initialEntityId ??
    null;
  const [entityId, setEntityId] = useState<string | null>(currentEntityId);
  const openEntity = entities.find((entity) => entity.id === entityId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-wide text-muted">
          {labels.capture.entity}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {entities.map((entity, index) => (
            <Chip
              key={entity.id}
              label={entity.name}
              note={
                entity.kind === "personal"
                  ? labels.capture.privateMark
                  : undefined
              }
              dotClass={
                entity.id === entityId ? undefined : entityTone(index).bg
              }
              selected={entity.id === entityId}
              onClick={() => {
                setEntityId(entity.id === entityId ? null : entity.id);
              }}
            />
          ))}
          {onAddChild !== undefined && (
            <InlineAddChip
              label={labels.capture.newChild}
              placeholder={labels.capture.newChildName}
              onAdd={async (name) => {
                const id = await onAddChild(name);
                if (id !== null) {
                  setEntityId(id);
                }
              }}
            />
          )}
        </div>
      </div>
      {openEntity !== undefined && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-wide text-muted">
            {labels.capture.domain}
          </span>
          <div className="flex flex-wrap gap-1.5">
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
            {onAddDomain !== undefined && (
              <InlineAddChip
                label={labels.capture.newDomain}
                placeholder={labels.capture.newDomainName}
                onAdd={async (name) => {
                  const id = await onAddDomain(openEntity, name);
                  if (id !== null) {
                    onChange(id);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
