import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { StapleMerge } from '../../types/domain';
import { Icon } from '../ui/Icon';

type StapleMergesProps = {
  readonly merges: readonly StapleMerge[];
  readonly onUnmerge: (mergeId: string) => void;
};

/** What was merged on the fixed list, folded under one line, each with a way to undo it. */
export function StapleMerges({ merges, onUnmerge }: StapleMergesProps): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (merges.length === 0) {
    return null;
  }
  return (
    <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex min-h-12 w-full items-center gap-2 px-3.5 text-start"
      >
        <Icon name="repeat" className="size-4.5 text-muted" />
        <span className="flex-1 text-[15px] font-semibold">
          {labels.staples.mergesTitle(merges.length)}
        </span>
        <Icon
          name="down"
          className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="flex flex-col border-t border-line">
          <p className="px-3.5 pt-2.5 text-[13px] text-muted">{labels.staples.mergesHint}</p>
          <ul className="flex flex-col">
            {merges.map((merge) => (
              <li
                key={merge.id}
                className="flex min-h-12 items-center gap-3 border-t border-line px-3.5 py-2 first:border-t-0"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px]">
                    {labels.staples.mergedInto(merge.merged_title, merge.kept_title)}
                  </span>
                  <span className="text-xs text-muted">{labels.staples.mergeHow[merge.how]}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUnmerge(merge.id);
                  }}
                  className="min-h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold text-primary transition active:scale-[0.97] active:bg-primary-soft"
                >
                  {labels.staples.unmerge}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
