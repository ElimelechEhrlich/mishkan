import type { ReactElement } from 'react';
import { DebtForm } from '../components/debts/DebtForm';
import { DebtSection } from '../components/debts/DebtSection';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAreas } from '../hooks/useAreas';
import { useDebts } from '../hooks/useDebts';
import { useItems } from '../hooks/useItems';
import { findDebtDomainId } from '../lib/lookups';

export function DebtsPage(): ReactElement {
  const areas = useAreas();
  const items = useItems();
  const debts = useDebts(items.items, items.reload);
  const isEmpty = debts.owedToUs.length === 0 && debts.weOwe.length === 0;

  return (
    <PageShell title={labels.pages.debts} incompleteCount={items.incomplete.length}>
      <ErrorBanner message={debts.error ?? items.error ?? areas.error} />
      <DebtForm domainId={findDebtDomainId(areas.areas)} onAdd={debts.addDebt} />
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
    </PageShell>
  );
}
