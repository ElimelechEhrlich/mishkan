import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';

type SummaryTilesProps = {
  readonly overdue: number;
  readonly today: number;
  readonly incomplete: number;
};

/** Low tiles, the number beside its name, so the summary takes one short line of the page. */
const tileClass =
  'flex flex-1 items-baseline justify-center gap-1.5 rounded-xl bg-surface px-2.5 py-1.5 shadow-card';

/** Three numbers at the top of the main page: late, due today, and waiting to be completed. */
export function SummaryTiles({ overdue, today, incomplete }: SummaryTilesProps): ReactElement {
  return (
    <div className="flex gap-2">
      <div className={tileClass}>
        <span
          className={`font-display text-lg leading-6 font-bold ${overdue > 0 ? 'text-alert' : ''}`}
        >
          {String(overdue)}
        </span>
        <span className="text-xs text-muted">{labels.summary.overdue}</span>
      </div>
      <div className={tileClass}>
        <span className="font-display text-lg leading-6 font-bold">{String(today)}</span>
        <span className="text-xs text-muted">{labels.summary.today}</span>
      </div>
      <Link to="/incomplete" className={`${tileClass} transition active:scale-[0.98]`}>
        <span className="font-display text-lg leading-6 font-bold">{String(incomplete)}</span>
        <span className="text-xs text-muted">{labels.summary.incomplete}</span>
      </Link>
    </div>
  );
}
