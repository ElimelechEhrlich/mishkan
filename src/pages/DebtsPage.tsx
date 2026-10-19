import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { DebtSection } from '../components/debts/DebtSection';
import { DebtTabs } from '../components/debts/DebtTabs';
import { ScopeBar } from '../components/entities/ScopeBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useDebts } from '../hooks/useDebts';
import { useEntities } from '../hooks/useEntities';
import { useEverythingShortcut } from '../hooks/useEverythingShortcut';
import { useItems } from '../hooks/useItems';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function DebtsPage(): ReactElement {
  const { scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities);
  const debts = useDebts(scoped.items);
  const shown = debts.direction === 'we_owe' ? debts.weOwe : debts.owedToUs;
  const tone = debts.direction === 'we_owe' ? 'alert' : 'primary';
  const toEverything = useEverythingShortcut(entities.entities);

  return (
    <PageShell
      toEverything={toEverything}
      title={labels.pages.debts}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={debts.error ?? items.error ?? entities.error} />
      <ScopeBar
        onEntityChanged={entities.reload}
        entities={entities.entities}
        scopeId={scopeId}
        onChange={setScope}
      />
      <DebtTabs totals={debts.totals} selected={debts.direction} onSelect={debts.setDirection} />
      <DebtSection
        title={labels.debts.important}
        debts={shown.filter((debt) => debt.details.important)}
        tone={tone}
        onClose={items.completeItem}
      />
      <DebtSection
        title={labels.debts.canWait}
        debts={shown.filter((debt) => !debt.details.important)}
        tone={tone}
        onClose={items.completeItem}
      />
      {shown.length === 0 && !items.loading && <EmptyState text={labels.debts.noneHere} />}
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
