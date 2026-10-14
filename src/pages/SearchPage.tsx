import type { ReactElement } from 'react';
import { SearchResults } from '../components/items/SearchResults';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { TextField } from '../components/ui/TextField';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useSearch } from '../hooks/useSearch';

export function SearchPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const search = useSearch(entities.entities);

  return (
    <PageShell
      title={labels.pages.search}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
      hideNav
      heading={
        <TextField
          label={labels.search.field}
          value={search.term}
          onChange={search.setTerm}
          autoFocus
          compact
        />
      }
    >
      <ErrorBanner message={search.error ?? entities.error} />
      <SearchResults search={search} entities={entities.entities} lookups={lookups} />
    </PageShell>
  );
}
