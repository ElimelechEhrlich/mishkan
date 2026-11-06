import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { pairKey } from '../../lib/stapleSimilarity';
import type { ShoppingStaple } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';

type Pair = readonly [ShoppingStaple, ShoppingStaple];

type AlikeStaplesProps = {
  /** Pairs of names that look like the same product by their spelling. */
  readonly pairs: readonly Pair[];
  /** Pairs the smart check called one product in other words; null before it ran. */
  readonly smartPairs: readonly Pair[] | null;
  /** What the smart check says two names both are ("נוזל כלים"); null when it said nothing. */
  readonly smartWhy: (a: string, b: string) => string | null;
  readonly checking: boolean;
  readonly onSmartCheck: () => void;
  /** The two are one product: the kept name stays, with both counts. */
  readonly onMerge: (keepId: string, dropId: string, how: 'manual' | 'smart') => void;
  /** The two are not the same product: not asked again. */
  readonly onApart: (pairKey: string) => void;
};

/**
 * Names on the fixed list that may be one product written twice, folded under one line: those
 * alike in spelling ("עגבניה" and "עגבניות"), and those the smart check finds in other words
 * ("פיירי" and "נוזל כלים"). Each pair is merged into the name to keep, or marked not the same.
 */
export function AlikeStaples({
  pairs,
  smartPairs,
  smartWhy,
  checking,
  onSmartCheck,
  onMerge,
  onApart,
}: AlikeStaplesProps): ReactElement {
  const [open, setOpen] = useState(false);
  const count = pairs.length + (smartPairs?.length ?? 0);

  function pairRow([a, b]: Pair, how: 'manual' | 'smart'): ReactElement {
    const why = how === 'smart' ? smartWhy(a.title, b.title) : null;
    return (
      <li
        key={`${a.id}-${b.id}`}
        className="flex flex-col gap-2 border-t border-line px-3.5 py-3 first:border-t-0"
      >
        <p className="text-[15px] font-medium">
          {a.title}
          {labels.item.separator}
          {b.title}
        </p>
        {why !== null && why !== '' && (
          <p className="-mt-1 text-[13px] text-muted">{labels.staples.bothAre(why)}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Chip
            label={labels.staples.keep(a.title)}
            selected={false}
            onClick={() => {
              onMerge(a.id, b.id, how);
            }}
          />
          <Chip
            label={labels.staples.keep(b.title)}
            selected={false}
            onClick={() => {
              onMerge(b.id, a.id, how);
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
    );
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
        <span className="flex-1 text-[15px] font-semibold">{labels.staples.alikeTitle(count)}</span>
        <Icon
          name="down"
          className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="flex flex-col border-t border-line">
          {pairs.length > 0 && (
            <>
              <p className="px-3.5 pt-2.5 text-[13px] text-muted">{labels.staples.alikeHint}</p>
              <ul className="flex flex-col">{pairs.map((pair) => pairRow(pair, 'manual'))}</ul>
            </>
          )}
          {smartPairs !== null && smartPairs.length > 0 && (
            <>
              <p className="border-t border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-muted">
                {labels.staples.smartFound}
              </p>
              <ul className="flex flex-col">{smartPairs.map((pair) => pairRow(pair, 'smart'))}</ul>
            </>
          )}
          <div className="flex flex-col gap-2 border-t border-line px-3.5 py-3">
            {smartPairs === null ? (
              <p className="text-[13px] text-muted">{labels.staples.smartHint}</p>
            ) : (
              smartPairs.length === 0 && (
                <p className="text-[13px] text-muted">{labels.staples.smartNone}</p>
              )
            )}
            <button
              type="button"
              disabled={checking}
              onClick={onSmartCheck}
              className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full bg-primary-soft px-4 text-[14px] font-semibold text-primary transition active:scale-[0.97] disabled:opacity-60"
            >
              <Icon name="chat" className="size-4" />
              {checking ? labels.staples.smartChecking : labels.staples.smartCheck}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
