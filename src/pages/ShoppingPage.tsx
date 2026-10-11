import type { ReactElement } from 'react';
import { MissingItemForm } from '../components/shopping/MissingItemForm';
import { RunCard } from '../components/shopping/RunCard';
import { ShoppingSection } from '../components/shopping/ShoppingSection';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useShopping } from '../hooks/useShopping';

export function ShoppingPage(): ReactElement {
  const entities = useEntities();
  const items = useItems();
  const shopping = useShopping(items, entities.entities);
  const isEmpty =
    shopping.shared.length === 0 && shopping.personal.length === 0 && shopping.runs.length === 0;

  return (
    <PageShell title={labels.pages.shopping} incompleteCount={items.incomplete.length}>
      <ErrorBanner message={shopping.error ?? items.error ?? entities.error} />
      <MissingItemForm targets={shopping.targets} onAdd={shopping.addMissingItem} />
      {shopping.runs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-bold tracking-wide text-muted">
            {labels.shopping.openRuns}
          </h2>
          {shopping.runs.map((run) => (
            <RunCard key={run.run.id} run={run} />
          ))}
        </section>
      )}
      <ShoppingSection
        title={labels.shopping.shared}
        groups={shopping.shared}
        entityNames={shopping.entityNames}
        onBuy={shopping.toggleBought}
        onStartRun={(category) => {
          shopping.startRun(category, false);
        }}
      />
      <ShoppingSection
        title={labels.shopping.private}
        groups={shopping.personal}
        entityNames={shopping.entityNames}
        onBuy={shopping.toggleBought}
        onStartRun={(category) => {
          shopping.startRun(category, true);
        }}
      />
      {isEmpty && !items.loading && <EmptyState text={labels.status.noMissingItems} />}
    </PageShell>
  );
}
