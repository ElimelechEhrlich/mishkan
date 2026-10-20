import type { ReactElement } from 'react';
import { Link } from 'react-router';
import type { OtherMeta } from '../../hooks/useOtherItems';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

type OtherLineProps = {
  readonly item: Item;
  readonly icon: IconName;
  readonly meta: OtherMeta | undefined;
  readonly lookups: Lookups;
};

const metaTones = { alert: 'text-alert', primary: 'text-primary', muted: 'text-faint' } as const;

/** One item with no time of its own: its kind's sign in its entity's color, and what it holds. */
export function OtherLine({ item, icon, meta, lookups }: OtherLineProps): ReactElement {
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);
  return (
    <li>
      <Link
        to={`/item/${item.id}`}
        className="flex min-h-12 items-center gap-3 py-2 active:opacity-60"
      >
        <Icon name={icon} className={`size-5 shrink-0 ${tone?.text ?? 'text-muted'}`} />
        <span className="min-w-0 flex-1 truncate text-[15px]">{item.title}</span>
        {meta !== undefined && (
          <span
            className={`max-w-[40%] shrink-0 truncate text-[13px] tabular-nums ${metaTones[meta.tone]}`}
          >
            {meta.text}
          </span>
        )}
      </Link>
    </li>
  );
}
