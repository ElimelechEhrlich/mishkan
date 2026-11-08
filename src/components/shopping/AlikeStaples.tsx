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

  const expanded = explaining || checking || ran;

  return (
    // One small round button; what it finds, what it is doing and what it is open inside it.
    <section
      className={`flex flex-col overflow-hidden bg-primary-soft transition-all ${
        expanded ? 'rounded-3xl' : 'self-center rounded-full'
      }`}
    >
      <div className="flex items-center gap-1 ps-1 pe-1">
        <button
          type="button"
          disabled={checking}
          onClick={onSmartCheck}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-full ps-3 pe-2 text-[14px] font-semibold text-primary transition active:scale-[0.97]"
        >
          {checking ? (
            <SmartCheckLog steps={steps} />
          ) : (
            <>
              <Icon name="sparkle" className="size-4.5 shrink-0" />
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
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition active:scale-90 ${
            explaining ? 'bg-primary text-white' : 'bg-surface text-muted'
          }`}
        >
          ?
        </button>
      </div>
      {explaining && (
        <p className="animate-fade-in px-3.5 pb-3 text-[13px] leading-relaxed text-primary/80">
          {labels.staples.smartExplain}
        </p>
      )}
      {ran && !checking && (
        <div className="m-1 mt-0 flex animate-fade-in flex-col overflow-hidden rounded-[1.25rem] bg-surface">
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
        </div>
      )}
    </section>
  );
}
