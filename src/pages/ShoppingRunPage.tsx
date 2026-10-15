import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { RunChecklist } from '../components/shopping/RunChecklist';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useRunView } from '../hooks/useRunView';
import { useShopping } from '../hooks/useShopping';
import { useShoppingDepartments } from '../hooks/useShoppingDepartments';

export function ShoppingRunPage(): ReactElement {
  const { runId } = useParams();
  const entities = useEntities();
  const items = useItems();
  const shopping = useShopping(items, entities.entities);
  const departments = useShoppingDepartments();
  const [view, setView] = useRunView();
  const run = shopping.runs.find((candidate) => candidate.run.id === runId);
  // A supermarket run is shown by department once they are known.
  const isSupermarket =
    run !== undefined &&
    run.items.length > 0 &&
    run.items.every((item) => item.shopping_category === 'food');

  return (
    <PageShell
      title={run?.run.title ?? labels.kind.shopping_run}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
    >
      <ErrorBanner message={shopping.error ?? items.error ?? entities.error ?? departments.error} />
      {run === undefined ? (
        <EmptyState text={items.loading ? labels.status.loading : labels.status.runNotFound} />
      ) : (
        <RunChecklist
          run={run}
          entityNames={shopping.entityNames}
          departments={isSupermarket && departments.loaded ? departments.departments : null}
          chosen={departments.chosen}
          view={view}
          onViewChange={setView}
          onToggle={shopping.toggleBought}
          onFinish={items.completeItem}
        />
      )}
    </PageShell>
  );
}
