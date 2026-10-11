import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { toListEntries, withoutNestedSteps } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import { entityTone } from '../lib/lookups';
import type { EntityTone, Lookups } from '../lib/lookups';
import type { Domain, EntityWithDomains } from '../types/domain';
import { useEntities } from './useEntities';
import type { UseEntities } from './useEntities';
import { useItems } from './useItems';
import type { UseItems } from './useItems';
import { useLookups } from './useLookups';
import { useHouseholdContext } from './useRouteContext';

export type DomainSection = {
  readonly domain: Domain;
  readonly entries: readonly ListEntry[];
};

export type UseEntityPage = {
  readonly entities: UseEntities;
  readonly items: UseItems;
  readonly lookups: Lookups;
  /** The entity named in the URL, or undefined while loading or when it is not visible. */
  readonly entity: EntityWithDomains | undefined;
  /** Each domain of the entity with its open items. */
  readonly sections: readonly DomainSection[];
  readonly tone: EntityTone;
  /** Open items of the entity, all domains together. */
  readonly openCount: number;
  /** Set when the add sheet should open on a domain; a new `key` each time it is asked for. */
  readonly addRequest: { readonly domainId: string; readonly key: number } | null;
  readonly requestAdd: (domainId: string) => void;
  /** Children, parents and the couple have a profile with dates. */
  readonly hasProfile: boolean;
  /** Which way the page slides in: toward an entity later in the strip, or an earlier one. */
  readonly direction: 'next' | 'previous';
};

/** Everything the entity page needs about the entity in its URL. */
export function useEntityPage(): UseEntityPage {
  const { entityId } = useParams();
  const { members, scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);

  const entity = entities.entities.find((candidate) => candidate.id === entityId);
  const index = entities.entities.findIndex((candidate) => candidate.id === entityId);

  // Opening an entity's page narrows every tab to it, until "everything" is chosen.
  const openId = entity?.id;
  useEffect(() => {
    if (openId !== undefined && openId !== scopeId) {
      setScope(openId);
    }
  }, [openId, scopeId, setScope]);

  // The slide direction is worked out when the entity changes, from where it sits
  // in the strip relative to the one shown before.
  const [shown, setShown] = useState<{
    readonly index: number;
    readonly direction: 'next' | 'previous';
  }>({ index, direction: 'next' });
  if (index !== -1 && index !== shown.index) {
    setShown({ index, direction: index > shown.index ? 'next' : 'previous' });
  }

  const sections = useMemo(() => {
    if (entity === undefined) {
      return [];
    }
    const rows = withoutNestedSteps(items.items).filter((item) => item.kind !== 'question');
    return entity.domains.map((domain) => ({
      domain,
      entries: toListEntries(
        rows.filter((item) => item.domain_id === domain.id),
        items.steps,
      ),
    }));
  }, [entity, items.items, items.steps]);

  const openCount = sections.reduce((sum, section) => sum + section.entries.length, 0);

  const [addRequest, setAddRequest] = useState<UseEntityPage['addRequest']>(null);
  const requestAdd = useCallback((domainId: string): void => {
    setAddRequest((previous) => ({ domainId, key: (previous?.key ?? 0) + 1 }));
  }, []);

  return {
    entities,
    items,
    lookups,
    entity,
    sections,
    tone: entityTone(Math.max(index, 0)),
    openCount,
    addRequest,
    requestAdd,
    hasProfile:
      entity !== undefined &&
      (entity.kind === 'child' || entity.kind === 'parent' || entity.kind === 'couple'),
    direction: shown.direction,
  };
}
