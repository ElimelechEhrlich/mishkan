import { useState } from 'react';
import { Link } from 'react-router';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { OtherMeta } from '../../hooks/useOtherItems';
import type { Lookups } from '../../lib/lookups';
import type { OtherGroup } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';
import { OtherLine } from './OtherLine';

type OtherCardProps = {
  /** The open group, if any; the page keeps one open at a time. */
  readonly chosen: OtherGroup | null;
  readonly onChoose: (group: OtherGroup | null) => void;
  readonly groups: Record<OtherGroup, readonly Item[]>;
  readonly meta: ReadonlyMap<string, OtherMeta>;
  readonly lookups: Lookups;
};

/** Lines shown before "more". */
const firstLines = 6;

const kinds = [
  { group: 'issues', icon: 'alert' },
  { group: 'notes', icon: 'note' },
  { group: 'debts', icon: 'wallet' },
  { group: 'shopping', icon: 'cart' },
  { group: 'trackers', icon: 'chart' },
] as const;

/** The page of each kind that has one, to go on to from here. */
const pages: Partial<Record<OtherGroup, { readonly to: string; readonly label: string }>> = {
  issues: { to: '/goals?tab=issues', label: labels.today.otherPage.issues },
  notes: { to: '/notes', label: labels.today.otherPage.notes },
  debts: { to: '/debts', label: labels.today.otherPage.debts },
  shopping: { to: '/shopping', label: labels.today.otherPage.shopping },
};

/**
 * The items with no time of their own, apart from tasks and goals: one white card with a small
 * sign for each kind and its count, and the chosen kind's items under them.
 */
export function OtherCard({
  chosen,
  onChoose,
  groups,
  meta,
  lookups,
}: OtherCardProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const items = chosen === null ? [] : groups[chosen];
  const shown = expanded ? items : items.slice(0, firstLines);
  const hidden = items.length - shown.length;
  const page = chosen === null ? undefined : pages[chosen];
  const icon = kinds.find((kind) => kind.group === chosen)?.icon ?? 'note';

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[13px] font-semibold text-muted">{labels.today.otherTitle}</h2>
      <div className="rounded-2xl bg-surface p-1.5 shadow-card">
        <div role="tablist" className="grid grid-cols-5 gap-1">
          {kinds.map((kind) => {
            const selected = kind.group === chosen;
            const count = groups[kind.group].length;
            return (
              <button
                key={kind.group}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  onChoose(selected ? null : kind.group);
                  setExpanded(false);
                }}
                className={`flex flex-col items-center rounded-xl py-1.5 transition active:scale-[0.97] ${
                  selected ? 'bg-primary-soft text-primary' : 'text-muted'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Icon name={kind.icon} className="size-4" />
                  <span
                    className={`text-[15px] font-bold tabular-nums ${
                      count === 0 ? 'text-faint' : selected ? 'text-primary' : 'text-ink'
                    }`}
                  >
                    {String(count)}
                  </span>
                </span>
                <span className="text-[11px] font-medium">{labels.today.other[kind.group]}</span>
              </button>
            );
          })}
        </div>
        {chosen !== null && (
          <div className="mt-1 border-t border-line px-2">
            {items.length === 0 ? (
              <p className="py-3 text-center text-[14px] text-muted">
                {labels.today.emptyOther[chosen]}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {shown.map((item) => (
                  <OtherLine
                    key={item.id}
                    item={item}
                    icon={icon}
                    meta={meta.get(item.id)}
                    lookups={lookups}
                  />
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between border-t border-line py-1">
              {items.length > firstLines ? (
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(!expanded);
                  }}
                  className="min-h-9 rounded-full px-2 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
                >
                  {hidden > 0 ? labels.today.showMore(hidden) : labels.today.showLess}
                </button>
              ) : (
                <span />
              )}
              {page !== undefined && (
                <Link
                  to={page.to}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-[13px] font-medium text-muted transition active:scale-[0.97]"
                >
                  {page.label}
                  <Icon name="forward" className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
