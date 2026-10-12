import type { ReactElement } from 'react';
import { ScopeBar } from '../components/entities/ScopeBar';
import { CategoryBar } from '../components/shopping/CategoryBar';
import { MisplacedItems } from '../components/shopping/MisplacedItems';
import { MissingItemForm } from '../components/shopping/MissingItemForm';
import { RunCard } from '../components/shopping/RunCard';
import { ShoppingSection } from '../components/shopping/ShoppingSection';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useCategoryFilter } from '../hooks/useCategoryFilter';
import { useEntities } from '../hooks/useEntities';
import { useEverythingShortcut } from '../hooks/useEverythingShortcut';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';
import { useShopping } from '../hooks/useShopping';

export function ShoppingPage(): ReactElement {
  const { scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities);
  const shopping = useShopping(items, entities.entities, scoped.scope);
  const filter = useCategoryFilter(shopping.shared, shopping.personal);
  const isEmpty =
    shopping.shared.length === 0 &&
    shopping.personal.length === 0 &&
    shopping.runs.length === 0 &&
    shopping.misplaced.length === 0;
  const toEverything = useEverythingShortcut(entities.entities);

  return (
    <PageShell
      toEverything={toEverything}
      title={labels.pages.shopping}
      incompleteCount={scoped.incomplete.length}
    >
      <ErrorBanner message={shopping.error ?? items.error ?? entities.error} />
      <ScopeBar entities={entities.entities} scopeId={scopeId} onChange={setScope} />
      <CategoryBar options={filter.options} value={filter.category} onChange={filter.setCategory} />
      <MissingItemForm
        key={scoped.scope?.id ?? 'all'}
        targets={shopping.targets}
        onAdd={items.addMissingItem}
      />
      {shopping.runs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-bold tracking-wide text-muted">
            {labels.shopping.openRuns}
          </h2>
          {shopping.runs.map((run) => (
            <RunCard key={run.run.id} run={run} />
          ))}
        </section>
      )}
      <ShoppingSection
        title={labels.shopping.shared}
        groups={filter.shared}
        entityNames={shopping.entityNames}
        onBuy={shopping.toggleBought}
        onStartRun={(category) => {
          shopping.startRun(category, false);
        }}
      />
      <ShoppingSection
        title={labels.shopping.private}
        groups={filter.personal}
        entityNames={shopping.entityNames}
        onBuy={shopping.toggleBought}
        onStartRun={(category) => {
          shopping.startRun(category, true);
        }}
      />
      <MisplacedItems
        items={shopping.misplaced}
        entityNames={shopping.entityNames}
        onMakeMissing={shopping.makeMissing}
      />
      {isEmpty && !items.loading && <EmptyState text={labels.status.noMissingItems} />}
    </PageShell>
  );
}
