import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { RunChecklist } from '../components/shopping/RunChecklist';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useShopping } from '../hooks/useShopping';

export function ShoppingRunPage(): ReactElement {
  const { runId } = useParams();
  const entities = useEntities();
  const items = useItems();
  const shopping = useShopping(items, entities.entities);
  const run = shopping.runs.find((candidate) => candidate.run.id === runId);

  return (
    <PageShell
      title={run?.run.title ?? labels.kind.shopping_run}
      incompleteCount={items.incomplete.length}
      inner
    >
      <ErrorBanner message={shopping.error ?? items.error ?? entities.error} />
      {run === undefined ? (
        <EmptyState text={items.loading ? labels.status.loading : labels.status.runNotFound} />
      ) : (
        <RunChecklist
          run={run}
          entityNames={shopping.entityNames}
          onToggle={shopping.toggleBought}
          onFinish={items.completeItem}
        />
      )}
    </PageShell>
  );
}
