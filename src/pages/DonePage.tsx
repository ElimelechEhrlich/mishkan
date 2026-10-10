import type { ReactElement } from 'react';
import { DoneList } from '../components/items/DoneList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useDoneItems } from '../hooks/useDoneItems';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function DonePage(): ReactElement {
  const { members } = useHouseholdContext();
  const areas = useAreas();
  const items = useItems();
  const done = useDoneItems();
  const lookups = useLookups(areas.areas, members);

  return (
    <PageShell title={labels.pages.done} incompleteCount={items.incomplete.length} inner>
      <ErrorBanner message={done.error ?? areas.error} />
      <DoneList
        items={done.items}
        lookups={lookups}
        loading={done.loading}
        onReopen={done.reopen}
      />
    </PageShell>
  );
}
