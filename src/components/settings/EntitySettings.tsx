import type { ReactElement } from "react";
import { labels } from "../../constants/labels";
import type { UseEntitySettings } from "../../hooks/useEntitySettings";
import { entityTone } from "../../lib/lookups";
import type { EntityKind, EntityWithDomains } from "../../types/domain";
import { ErrorBanner } from "../ui/ErrorBanner";
import { AddEntityRow } from "./AddEntityRow";
import { EntityGroup } from "./EntityGroup";
import { EntitySettingsCard } from "./EntitySettingsCard";

type EntitySettingsProps = {
  readonly entities: readonly EntityWithDomains[];
  readonly settings: UseEntitySettings;
};

/** A household has at most two parents. */
const maxParents = 2;

/**
 * The entities in three groups that fold: the home (with the couple), the parents (with
 * the private personal entity) and the children. Each entity opens in place to edit its
 * domains; the parents and children groups end with a row for adding one more.
 */
export function EntitySettings({
  entities,
  settings,
}: EntitySettingsProps): ReactElement {
  const card = (entity: EntityWithDomains, featured = false): ReactElement => (
    <EntitySettingsCard
      key={entity.id}
      entity={entity}
      tone={entityTone(entities.indexOf(entity))}
      settings={settings}
      featured={featured}
    />
  );
  const ofKinds = (...kinds: EntityKind[]): EntityWithDomains[] =>
    entities.filter((entity) => kinds.includes(entity.kind));

  const home = ofKinds("home", "couple");
  const parents = ofKinds("parent", "personal");
  const parentCount = ofKinds("parent").length;
  const children = ofKinds("child");

  return (
    <>
      <ErrorBanner message={settings.error} />
      <EntityGroup title={labels.settings.homeGroup} count={home.length}>
        {home.map((entity) => card(entity, entity.kind === "home"))}
      </EntityGroup>
      <EntityGroup title={labels.settings.parents} count={parentCount}>
        {parents.map((entity) => card(entity))}
        {parentCount < maxParents ? (
          <AddEntityRow
            icon="userPlus"
            title={labels.settings.addParent}
            subtitle={labels.settings.addParentShort}
            fieldLabel={labels.fields.parentName}
            hint={labels.settings.addParentHint}
            onAdd={(name) => {
              settings.addEntity("parent", name);
            }}
          />
        ) : (
          <li className="px-3.5 py-2.5 text-[13px] text-muted">
            {labels.settings.parentsFull}
          </li>
        )}
      </EntityGroup>
      <EntityGroup title={labels.settings.children} count={children.length}>
        {children.map((entity) => card(entity))}
        <AddEntityRow
          icon="plus"
          title={labels.settings.addChild}
          fieldLabel={labels.fields.childName}
          onAdd={(name) => {
            settings.addEntity("child", name);
          }}
        />
      </EntityGroup>
    </>
  );
}
