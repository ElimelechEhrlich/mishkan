import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { pairKey } from '../../lib/stapleSimilarity';
import type { ShoppingStaple } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';

type AlikeStaplesProps = {
  /** Pairs of names that look like the same product. */
  readonly pairs: readonly (readonly [ShoppingStaple, ShoppingStaple])[];
  /** The two are one product: the kept name stays, with both counts. */
  readonly onMerge: (keepId: string, dropId: string) => void;
  /** The two are not the same product: not asked again. */
  readonly onApart: (pairKey: string) => void;
};

/**
 * Names on the fixed list that may be one product written twice ("עגבניה" and "עגבניות"),
 * folded under one line: each pair is merged into the name to keep, or marked not the same.
 */
export function AlikeStaples({ pairs, onMerge, onApart }: AlikeStaplesProps): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (pairs.length === 0) {
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
        <Icon name="list" className="size-4.5 text-primary" />
        <span className="flex-1 text-[15px] font-semibold">
          {labels.staples.alikeTitle(pairs.length)}
        </span>
        <Icon
          name="down"
          className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="flex flex-col border-t border-line">
          <p className="px-3.5 pt-2.5 text-[13px] text-muted">{labels.staples.alikeHint}</p>
          <ul className="flex flex-col">
            {pairs.map(([a, b]) => (
              <li
                key={`${a.id}-${b.id}`}
                className="flex flex-col gap-2 border-t border-line px-3.5 py-3 first:border-t-0"
              >
                <p className="text-[15px] font-medium">
                  {a.title}
                  {labels.item.separator}
                  {b.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip
                    label={labels.staples.keep(a.title)}
                    selected={false}
                    onClick={() => {
                      onMerge(a.id, b.id);
                    }}
                  />
                  <Chip
                    label={labels.staples.keep(b.title)}
                    selected={false}
                    onClick={() => {
                      onMerge(b.id, a.id);
                    }}
                  />
                  <Chip
                    label={labels.staples.notSame}
                    selected={false}
                    outline
                    onClick={() => {
                      onApart(pairKey(a.title, b.title));
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
