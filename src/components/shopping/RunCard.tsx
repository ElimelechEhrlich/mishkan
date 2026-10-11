import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { ShoppingRun } from '../../types/domain';
import { Icon } from '../ui/Icon';

type RunCardProps = {
  readonly run: ShoppingRun;
};

/** An open run on the shopping page: its name and how much of it is bought. */
export function RunCard({ run }: RunCardProps): ReactElement {
  const boughtCount = run.items.filter((item) => item.status === 'done').length;
  const percent = run.items.length === 0 ? 0 : (boughtCount / run.items.length) * 100;

  return (
    <Link
      to={`/shopping/run/${run.run.id}`}
      className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card transition active:scale-[0.99]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate text-[17px] font-semibold">{run.run.title}</span>
        <span className="h-1.5 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${String(percent)}%` }} />
        </span>
        <span className="text-[13px] text-muted">
          {labels.shopping.progress} {String(boughtCount)} {labels.shopping.of}{' '}
          {String(run.items.length)}
        </span>
      </span>
      <Icon name="forward" className="size-5 text-muted" />
    </Link>
  );
}
