import type { ReactElement } from 'react';
import { Button } from '../components/ui/Button';
import { DoneList } from '../components/items/DoneList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useDoneItems } from '../hooks/useDoneItems';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function DonePage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const done = useDoneItems();
  const lookups = useLookups(entities.entities, members);

  return (
    <PageShell
      title={labels.pages.done}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
    >
      <ErrorBanner message={done.error ?? entities.error} />
      <DoneList
        items={done.items}
        lookups={lookups}
        loading={done.loading}
        onReopen={done.reopen}
        onUnmark={done.unmark}
      />
      {done.hasMore && (
        <Button variant="soft" onClick={done.loadMore}>
          {labels.status.moreDone}
        </Button>
      )}
    </PageShell>
  );
}
