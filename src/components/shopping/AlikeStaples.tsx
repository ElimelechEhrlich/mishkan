import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { pairKey } from '../../lib/stapleSimilarity';
import type { ShoppingStaple } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { SmartCheckLog } from './SmartCheckLog';
import type { SmartCheckStep } from '../../hooks/useStaples';

type Pair = readonly [ShoppingStaple, ShoppingStaple];

type AlikeStaplesProps = {
  /** Pairs of names that look like the same product by their spelling. */
  readonly pairs: readonly Pair[];
  /** Pairs the smart check called one product in other words; null before it ran. */
  readonly smartPairs: readonly Pair[] | null;
  /** What the smart check says two names both are ("נוזל כלים"); null when it said nothing. */
  readonly smartWhy: (a: string, b: string) => string | null;
  readonly checking: boolean;
  /** What the smart check did, step by step, shown as it goes. */
  readonly steps: readonly SmartCheckStep[];
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
  steps,
  onSmartCheck,
  onMerge,
  onApart,
}: AlikeStaplesProps): ReactElement {
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

  const ran = smartPairs !== null;
  const [explaining, setExplaining] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* One button; while it runs, it says what the check is doing now. A "?" beside it tells
          what it does. */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={checking}
          onClick={onSmartCheck}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold shadow-halo transition active:scale-[0.97] ${
            checking ? 'w-full max-w-sm bg-surface text-primary' : 'bg-primary-soft text-primary'
          }`}
        >
          {checking ? (
            <SmartCheckLog steps={steps} />
          ) : (
            <>
              <Icon name="sparkle" className="size-5" />
              {ran ? labels.staples.smartAgain : labels.staples.smartCheck}
            </>
          )}
        </button>
        <button
          type="button"
          aria-label={labels.staples.smartHelp}
          aria-expanded={explaining}
          onClick={() => {
            setExplaining(!explaining);
          }}
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold transition active:scale-90 ${
            explaining ? 'bg-primary text-white' : 'bg-surface text-muted shadow-card'
          }`}
        >
          ?
        </button>
      </div>
      {explaining && (
        <p className="animate-fade-in rounded-2xl bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted shadow-card">
          {labels.staples.smartExplain}
        </p>
      )}
      {ran && !checking && (
        <section className="flex animate-fade-in flex-col overflow-hidden rounded-2xl bg-surface shadow-card">
          {pairs.length > 0 && (
            <>
              <p className="px-3.5 pt-2.5 text-[13px] text-muted">{labels.staples.alikeHint}</p>
              <ul className="flex flex-col">{pairs.map((pair) => pairRow(pair, 'manual'))}</ul>
            </>
          )}
          {smartPairs.length > 0 && (
            <>
              <p className="border-t border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-muted first:border-t-0">
                {labels.staples.smartFound}
              </p>
              <ul className="flex flex-col">{smartPairs.map((pair) => pairRow(pair, 'smart'))}</ul>
            </>
          )}
          {count === 0 && (
            <p className="px-3.5 py-3 text-[13px] text-muted">{labels.staples.smartNone}</p>
          )}
        </section>
      )}
    </div>
  );
}
