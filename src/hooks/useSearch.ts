import { useEffect, useMemo, useState } from 'react';
import { labels } from '../constants/labels';
import { toMessage } from '../lib/errors';
import { searchItems, searchListValues } from '../services/searchService';
import type { ListValueHit } from '../services/searchService';
import type { EntityWithDomains, Item } from '../types/domain';

/** An entity that matched, with what matched in it. */
export type EntityHit = {
  readonly entity: EntityWithDomains;
  /** Short lines naming what matched, such as "תחביבים: כדורגל". */
  readonly matches: readonly string[];
};

type SearchState = {
  readonly items: readonly Item[];
  readonly listValues: readonly ListValueHit[];
  readonly loading: boolean;
  readonly error: string | null;
};

export type UseSearch = SearchState & {
  readonly term: string;
  readonly setTerm: (term: string) => void;
  readonly entityHits: readonly EntityHit[];
  /** Whether a term long enough to search has been typed. */
  readonly searched: boolean;
};

/** Shorter terms match too much to be useful. */
const minLength = 2;
/** Waits for typing to pause before asking the database. */
const delayMs = 250;

/**
 * Searches items of every status (title, notes, answer) and the profiles of the entities:
 * their names, ID numbers, notes, domains and list values.
 */
export function useSearch(entities: readonly EntityWithDomains[]): UseSearch {
  const [term, setTerm] = useState('');
  const [state, setState] = useState<SearchState>({
    items: [],
    listValues: [],
    loading: false,
    error: null,
  });
  const trimmed = term.trim();
  const searched = trimmed.length >= minLength;

  useEffect(() => {
    if (!searched) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setState((previous) => ({ ...previous, loading: true }));
      Promise.all([searchItems(trimmed), searchListValues(trimmed)])
        .then(([items, listValues]) => {
          if (active) {
            setState({ items, listValues, loading: false, error: null });
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState((previous) => ({ ...previous, loading: false, error: toMessage(error) }));
          }
        });
    }, delayMs);
    return (): void => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, searched]);

  const entityHits = useMemo((): EntityHit[] => {
    if (!searched) {
      return [];
    }
    const needle = trimmed.toLowerCase();
    const has = (text: string | null): boolean =>
      text !== null && text.toLowerCase().includes(needle);
    return entities.flatMap((entity) => {
      const matches = [
        ...(has(entity.id_number) ? [`${labels.profile.idNumber}: ${entity.id_number ?? ''}`] : []),
        ...(has(entity.notes) ? [`${labels.profile.notes}: ${entity.notes ?? ''}`] : []),
        ...entity.domains
          .filter((domain) => has(domain.name))
          .map((domain) => `${labels.capture.domain}: ${domain.name}`),
        ...state.listValues
          .filter((hit) => hit.entityId === entity.id)
          .map((hit) => `${hit.listTitle}: ${hit.value}`),
      ];
      return has(entity.name) || matches.length > 0 ? [{ entity, matches }] : [];
    });
  }, [entities, searched, trimmed, state.listValues]);

  return {
    ...state,
    items: searched ? state.items : [],
    term,
    setTerm,
    entityHits,
    searched,
  };
}
