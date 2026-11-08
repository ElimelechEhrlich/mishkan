import type { ReactElement } from 'react';
import { AlikeStaples } from '../components/shopping/AlikeStaples';
import { StapleMerges } from '../components/shopping/StapleMerges';
import { StaplePicker } from '../components/shopping/StaplePicker';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { titleKey } from '../lib/departments';
import { alikePairs, groupPairs } from '../lib/stapleSimilarity';
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
  const alike = alikePairs(staples.staples, staples.apart);
  const smartPairs =
    staples.sameProducts === null
      ? null
      : groupPairs(
          staples.sameProducts.map((group) => group.names),
          staples.staples,
          staples.apart,
          alike,
        );
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
        <>
          <AlikeStaples
            pairs={alike}
            smartPairs={smartPairs}
            smartWhy={(a, b) =>
              staples.sameProducts?.find(
                (group) => group.names.includes(a) && group.names.includes(b),
              )?.why ?? null
            }
            checking={staples.checking}
            steps={staples.steps}
            onSmartCheck={staples.checkSameProducts}
            onMerge={staples.merge}
            onApart={staples.markApart}
          />
          <StapleMerges merges={staples.merges} onUnmerge={staples.unmerge} />
          <StaplePicker
            staples={staples.staples}
            departments={departments.departments}
            chosen={departments.chosen}
            listed={listed}
            saving={adding.saving}
            onAdd={adding.add}
            details={staples.details}
            onRename={staples.rename}
            onRemove={staples.remove}
            onChooseDepartment={departments.choose}
            onAddDepartment={departments.addAndChoose}
          />
        </>
      )}
    </PageShell>
  );
}
