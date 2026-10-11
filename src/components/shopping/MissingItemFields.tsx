import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { shoppingCategories } from '../../lib/itemRules';
import type { ShoppingCategory, ShoppingTarget } from '../../types/domain';
import { Chip } from '../ui/Chip';

type MissingItemFieldsProps = {
  readonly category: ShoppingCategory;
  readonly onCategoryChange: (category: ShoppingCategory) => void;
  /** Entities and their shopping domains, the home first. */
  readonly targets: readonly ShoppingTarget[];
  readonly domainId: string | null;
  readonly onDomainChange: (domainId: string) => void;
};

/** The kind of a missing item, and whom it is for. */
export function MissingItemFields({
  category,
  onCategoryChange,
  targets,
  domainId,
  onDomainChange,
}: MissingItemFieldsProps): ReactElement {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {shoppingCategories.map((option) => (
          <Chip
            key={option}
            label={labels.shoppingCategory[option]}
            selected={option === category}
            onClick={() => {
              onCategoryChange(option);
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">{labels.shopping.forWhom}</span>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {targets.map((target) => (
            <span key={target.domainId} className="shrink-0">
              <Chip
                label={target.entity.name}
                note={target.entity.kind === 'personal' ? labels.capture.privateMark : undefined}
                selected={target.domainId === domainId}
                onClick={() => {
                  onDomainChange(target.domainId);
                }}
              />
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
