import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ItemList } from '../components/items/ItemList';
import { MemberFilter } from '../components/items/MemberFilter';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { Segmented } from '../components/ui/Segmented';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useOpenSegments } from '../hooks/useOpenSegments';
import { formatToday } from '../lib/itemRules';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function OpenItemsPage(): ReactElement {
  const { member, members } = useHouseholdContext();
  const areas = useAreas();
  const items = useItems();
  const lookups = useLookups(areas.areas, members);
  const view = useOpenSegments(items.assigned);
  const [searchParams] = useSearchParams();

  return (
    <PageShell
      title={labels.pages.open}
      subtitle={formatToday()}
      incompleteCount={items.incomplete.length}
    >
      <ErrorBanner message={items.error ?? areas.error} />
      <Segmented options={view.options} value={view.segment} onChange={view.setSegment} />
      <MemberFilter members={members} value={view.memberFilter} onChange={view.setMemberFilter} />
      <ItemList
        items={view.visible}
        lookups={lookups}
        grouped={view.segment === 'active'}
        loading={items.loading}
        onComplete={items.completeItem}
      />
      <QuickAddSheet
        areas={areas.areas}
        currentMemberId={member.id}
        onAdd={items.addItem}
        initiallyOpen={searchParams.has('new')}
      />
    </PageShell>
  );
}
