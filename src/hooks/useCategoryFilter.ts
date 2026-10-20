import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { shoppingCategories } from '../lib/itemRules';
import type { ShoppingCategory } from '../types/domain';
import type { CategoryGroup } from './useShopping';

export type UseCategoryFilter = {
  /** Every category with how many are missing in it, in the list's order. */
  readonly options: readonly { readonly category: ShoppingCategory; readonly count: number }[];
  /** The chosen category, or null for all of them. */
  readonly category: ShoppingCategory | null;
  readonly setCategory: (category: ShoppingCategory | null) => void;
  /** The shared and the private part, narrowed to the chosen category. */
  readonly shared: readonly CategoryGroup[];
  readonly personal: readonly CategoryGroup[];
};

/** Narrows the shopping list to one category, such as urgent or food. */
export function useCategoryFilter(
  shared: readonly CategoryGroup[],
  personal: readonly CategoryGroup[],
): UseCategoryFilter {
  // Opened from going out shopping, the page starts on that list.
  const [searchParams] = useSearchParams();
  const [chosen, setCategory] = useState<ShoppingCategory | null>(
    () => shoppingCategories.find((category) => category === searchParams.get('category')) ?? null,
  );

  return useMemo(() => {
    const count = (category: ShoppingCategory): number =>
      [...shared, ...personal]
        .filter((group) => group.category === category)
        .reduce((sum, group) => sum + group.items.length, 0);
    const options = shoppingCategories.map((category) => ({ category, count: count(category) }));
    // A category that has emptied out lets the whole list show again.
    const category = options.some((option) => option.category === chosen && option.count > 0)
      ? chosen
      : null;
    const narrow = (groups: readonly CategoryGroup[]): readonly CategoryGroup[] =>
      category === null ? groups : groups.filter((group) => group.category === category);
    return {
      options,
      category,
      setCategory,
      shared: narrow(shared),
      personal: narrow(personal),
    };
  }, [shared, personal, chosen]);
}
