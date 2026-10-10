import type { ReactElement } from 'react';
import { ItemEditor } from '../components/items/ItemEditor';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useItemPage } from '../hooks/useItemPage';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function ItemPage(): ReactElement {
  const { members, addChild } = useHouseholdContext();
  const areas = useAreas();
  const page = useItemPage();
  const lookups = useLookups(areas.areas, members);
  const { items, item } = page;

  return (
    <PageShell
      title={item === null ? labels.pages.item : labels.kind[item.kind]}
      incompleteCount={items.incomplete.length}
      inner
    >
      <ErrorBanner message={items.error ?? areas.error} />
      {item === null ? (
        <EmptyState text={items.loading ? labels.status.loading : labels.status.itemNotFound} />
      ) : (
        <ItemEditor
          item={item}
          items={items.items}
          steps={page.steps}
          debt={page.debt}
          areas={areas.areas}
          members={members}
          lookups={lookups}
          onUpdate={items.updateItem}
          onComplete={items.completeItem}
          onReopen={items.reopenItem}
          onDelete={page.deleteAndLeave}
          onAddStep={page.addStep}
          onAddChild={addChild}
          onPrerequisitesChange={items.reload}
        />
      )}
    </PageShell>
  );
}
