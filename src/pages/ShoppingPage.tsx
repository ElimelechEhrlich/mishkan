import type { ReactElement } from 'react';
import { ScopeBar } from '../components/entities/ScopeBar';
import { CategoryBar } from '../components/shopping/CategoryBar';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { MissingItemForm } from '../components/shopping/MissingItemForm';
import { RunCard } from '../components/shopping/RunCard';
import { ShoppingSection } from '../components/shopping/ShoppingSection';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useTripOpener } from '../hooks/useAddRequest';
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
    shopping.trips.shared.size === 0 &&
    shopping.trips.personal.size === 0;
  const trip = useTripOpener();
  const sharedTripDomain = shopping.tripDomains.shared;
  const personalTripDomain = shopping.tripDomains.personal;
  const toEverything = useEverythingShortcut(entities.entities);

  return (
    <PageShell
      toEverything={toEverything}
      title={labels.pages.shopping}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={shopping.error ?? items.error ?? entities.error} />
      <ScopeBar
        onEntityChanged={entities.reload}
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
      />
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
        trips={shopping.trips.shared}
        only={filter.category}
        entityNames={shopping.entityNames}
        onBuy={shopping.toggleBought}
        onStartRun={(category) => {
          shopping.startRun(category, false);
        }}
        onPlanTrip={
          sharedTripDomain === null
            ? undefined
            : (category): void => {
                trip.open(category, sharedTripDomain);
              }
        }
      />
      <ShoppingSection
        title={labels.shopping.private}
        groups={filter.personal}
        trips={shopping.trips.personal}
        only={filter.category}
        entityNames={shopping.entityNames}
        onBuy={shopping.toggleBought}
        onStartRun={(category) => {
          shopping.startRun(category, true);
        }}
        onPlanTrip={
          personalTripDomain === null
            ? undefined
            : (category): void => {
                trip.open(category, personalTripDomain);
              }
        }
      />
      {sharedTripDomain !== null && (
        <button
          type="button"
          onClick={() => {
            trip.open(filter.category ?? 'food', sharedTripDomain);
          }}
          className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-full px-2 text-[13px] font-medium text-muted transition active:scale-[0.97]"
        >
          <Icon name="calendar" className="size-4" />
          {labels.shopping.planTripRow}
        </button>
      )}
      <QuickAddSheet
        key={`trip-${String(trip.request?.key ?? 0)}`}
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        initiallyOpen={trip.request !== null}
        initialDomainId={trip.request?.domainId}
        initialTrip={trip.request?.category}
        buttonless
      />
      {/* The add button of every page, here opening on something to buy. */}
      <QuickAddSheet
        key={scoped.scope?.id ?? 'all'}
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        defaultKind="missing_item"
        entityId={scoped.scope?.id}
      />
      {isEmpty && !items.loading && <EmptyState text={labels.status.noMissingItems} />}
    </PageShell>
  );
}
