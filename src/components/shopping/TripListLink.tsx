import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { ShoppingCategory } from '../../types/domain';
import { Icon } from '../ui/Icon';

type TripListLinkProps = {
  readonly category: ShoppingCategory;
};

/** On the page of going out shopping: its list, where the run is started. */
export function TripListLink({ category }: TripListLinkProps): ReactElement {
  return (
    <Link
      to={`/shopping?category=${category}`}
      className="flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-primary transition active:scale-[0.98]"
    >
      <Icon name="cart" className="size-5.5 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">
          {labels.shopping.toList(labels.shoppingCategory[category])}
        </span>
        <span className="text-[13px] opacity-80">{labels.shopping.toListHint}</span>
      </span>
      <Icon name="forward" className="size-4.5 shrink-0" />
    </Link>
  );
}
