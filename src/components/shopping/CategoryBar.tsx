import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ShoppingCategory } from '../../types/domain';
import { Chip } from '../ui/Chip';

type CategoryBarProps = {
  readonly options: readonly { readonly category: ShoppingCategory; readonly count: number }[];
  /** The chosen category, or null for all of them. */
  readonly value: ShoppingCategory | null;
  readonly onChange: (category: ShoppingCategory | null) => void;
};

/**
 * A quiet row of categories that narrows the shopping list, such as urgent or food.
 * Tapping the chosen one again lets it go. Hidden when there is nothing to choose between.
 */
export function CategoryBar({ options, value, onChange }: CategoryBarProps): ReactElement | null {
  if (options.length < 2) {
    return null;
  }
  return (
    <div
      role="group"
      aria-label={labels.shopping.category}
      className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none]"
    >
      <div className="mx-auto flex w-max gap-1.5">
        <Chip
          label={labels.filter.all}
          selected={value === null}
          onClick={() => {
            onChange(null);
          }}
        />
        {options.map((option) => (
          <Chip
            key={option.category}
            label={labels.shoppingCategory[option.category]}
            note={String(option.count)}
            selected={option.category === value}
            onClick={() => {
              onChange(option.category === value ? null : option.category);
            }}
          />
        ))}
      </div>
    </div>
  );
}
