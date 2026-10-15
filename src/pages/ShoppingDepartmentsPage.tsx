import type { ReactElement } from 'react';
import { DepartmentOrderList } from '../components/shopping/DepartmentOrderList';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useItems } from '../hooks/useItems';
import { useShoppingDepartments } from '../hooks/useShoppingDepartments';

export function ShoppingDepartmentsPage(): ReactElement {
  const items = useItems();
  const departments = useShoppingDepartments();

  return (
    <PageShell
      title={labels.departments.title}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
    >
      <ErrorBanner message={departments.error} />
      {departments.loaded ? (
        <DepartmentOrderList
          departments={departments.departments}
          onReorder={departments.reorder}
          onRename={departments.rename}
          onRemove={departments.remove}
          onAdd={departments.add}
        />
      ) : (
        <EmptyState text={labels.status.loading} />
      )}
    </PageShell>
  );
}
