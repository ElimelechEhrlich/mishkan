import type { ReactElement } from 'react';
import { StaplePicker } from '../components/shopping/StaplePicker';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { titleKey } from '../lib/departments';
import { useAddStaples } from '../hooks/useAddStaples';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useShopping } from '../hooks/useShopping';
import { useShoppingDepartments } from '../hooks/useShoppingDepartments';
import { useStaples } from '../hooks/useStaples';

export function ShoppingStaplesPage(): ReactElement {
  const entities = useEntities();
  const items = useItems();
  const shopping = useShopping(items, entities.entities);
  const departments = useShoppingDepartments();
  const staples = useStaples();
  // The home's shopping comes first among the targets.
  const adding = useAddStaples(items, shopping.targets[0]?.domainId ?? null);
  const listed = new Set(
    shopping.shared
      .filter((group) => group.category === 'food')
      .flatMap((group) => group.items.map((item) => titleKey(item.title))),
  );

  return (
    <PageShell
      title={labels.staples.title}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
    >
      <ErrorBanner message={staples.error ?? items.error ?? shopping.error ?? departments.error} />
      {!staples.loaded ? (
        <EmptyState text={labels.status.loading} />
      ) : staples.staples.length === 0 ? (
        <EmptyState text={labels.staples.empty} />
      ) : (
        <StaplePicker
          staples={staples.staples}
          departments={departments.departments}
          chosen={departments.chosen}
          listed={listed}
          saving={adding.saving}
          onAdd={adding.add}
          onRename={staples.rename}
          onRemove={staples.remove}
          onChooseDepartment={departments.choose}
          onAddDepartment={departments.addAndChoose}
        />
      )}
    </PageShell>
  );
}
