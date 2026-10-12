import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { DebtSection } from '../components/debts/DebtSection';
import { DebtSummary } from '../components/debts/DebtSummary';
import { ScopeBar } from '../components/entities/ScopeBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useDebts } from '../hooks/useDebts';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function DebtsPage(): ReactElement {
  const { scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities);
  const debts = useDebts(scoped.items);
  const isEmpty = debts.owedToUs.length === 0 && debts.weOwe.length === 0;

  return (
    <PageShell title={labels.pages.debts} incompleteCount={scoped.incomplete.length}>
      <ErrorBanner message={debts.error ?? items.error ?? entities.error} />
      <ScopeBar entities={entities.entities} scopeId={scopeId} onChange={setScope} />
      <DebtSummary owedToUs={debts.owedToUs} weOwe={debts.weOwe} />
      <DebtSection
        title={labels.debtDirection.owed_to_us}
        debts={debts.owedToUs}
        tone="primary"
        onClose={items.completeItem}
      />
      <DebtSection
        title={labels.debtDirection.we_owe}
        debts={debts.weOwe}
        tone="alert"
        onClose={items.completeItem}
      />
      {isEmpty && !items.loading && <EmptyState text={labels.status.noDebts} />}
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
        defaultKind="debt"
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
