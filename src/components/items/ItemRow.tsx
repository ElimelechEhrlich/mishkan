import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Lookups } from '../../lib/lookups';
import type { Item } from '../../types/domain';
import { CheckButton } from '../ui/CheckButton';
import { Icon } from '../ui/Icon';
import { CopyButton } from '../ui/CopyButton';
import { DueText } from './DueText';
import { trackerLine } from '../../lib/trackers';
import { ItemMeta } from './ItemMeta';

type ItemRowProps = {
  readonly item: Item;
  readonly lookups: Lookups;
  /** The goal or issue of a step that stands on its own here, so the row says whose step it is. */
  readonly parent?: Item | null;
  readonly today: string;
  readonly onComplete: (item: Item) => void;
  /** Leaves out the domain, on a page that already groups by it. */
  readonly hideDomain?: boolean;
};

/** How long a row stays ticked before it gives up waiting for the list to refresh. */
const completingTimeoutMs = 4000;

/**
 * One item in a list card: tick it off, or tap it to open its page.
 * The divider above it starts after the check, so the checks line up in one column.
 */
export function ItemRow({
  item,
  lookups,
  parent = null,
  today,
  onComplete,
  hideDomain = false,
}: ItemRowProps): ReactElement {
  const [completing, setCompleting] = useState(false);
  const tone = item.domain_id === null ? undefined : lookups.domainTones.get(item.domain_id);
  // A note that is one value, such as the gate's code, shows it right in the list.
  const value = item.kind === 'note' && item.is_value && item.answer !== null ? item.answer : '';
  // A tracker shows where it stands: its total or latest value, or how many entries it has.
  const trackerEntries =
    item.kind === 'tracker' ? (lookups.trackerEntries.get(item.id) ?? []) : null;
  const trackerSummary =
    trackerEntries === null
      ? null
      : (trackerLine(item.tracker_summary, item.tracker_unit, trackerEntries)?.value ??
        `${String(trackerEntries.length)} ${labels.tracker.entryCount}`);

  // If the save fails the row would stay ticked forever, so it is released after a while.
  useEffect(() => {
    if (!completing) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCompleting(false);
    }, completingTimeoutMs);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [completing]);

  return (
    <li
      className={`group flex gap-3 ps-3.5 transition duration-300 ${completing ? 'opacity-40' : ''}`}
    >
      <span className="w-5.5 shrink-0 pt-2">
        {/* A goal or an issue is closed only from its own page; in a list it shows its mark. */}
        {(item.kind === 'goal' || item.kind === 'issue') && (
          <Icon
            name={item.kind === 'goal' ? 'target' : 'alert'}
            className={`size-5.5 ${tone?.text ?? 'text-muted'}`}
          />
        )}
        {item.kind !== 'note' &&
          item.kind !== 'tracker' &&
          item.kind !== 'goal' &&
          item.kind !== 'issue' && (
            <CheckButton
              checked={completing}
              label={labels.actions.markDone}
              toneClass={tone?.border}
              onClick={() => {
                if (!completing) {
                  setCompleting(true);
                  onComplete(item);
                }
              }}
            />
          )}
      </span>
      <Link
        to={`/item/${item.id}`}
        className="flex min-w-0 flex-1 items-start gap-3 border-t border-line py-2 pe-3.5 group-first:border-t-0 active:opacity-70"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`text-[14px] leading-snug font-medium break-words ${completing ? 'line-through' : ''}`}
          >
            {item.title}
          </span>
          {parent !== null && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-primary">
              <Icon
                name={parent.kind === 'goal' ? 'target' : 'alert'}
                className="size-3.5 shrink-0"
              />
              <span className="truncate">
                {parent.kind === 'goal' ? labels.goals.stepOfGoal : labels.goals.stepOfIssue}{' '}
                {parent.title}
              </span>
            </span>
          )}
          {value !== '' && (
            <span className="text-[15px] font-semibold break-words" dir="auto">
              {value}
            </span>
          )}
          <ItemMeta item={item} lookups={lookups} today={today} hideDomain={hideDomain} />
        </span>
        {value !== '' ? (
          <CopyButton text={value} />
        ) : trackerSummary !== null ? (
          <span className="pt-0.5 text-sm font-semibold whitespace-nowrap">{trackerSummary}</span>
        ) : (
          <span className="pt-0.5">
            <DueText item={item} today={today} dayTimes={lookups.dayTimes.get(item.id)} />
          </span>
        )}
      </Link>
    </li>
  );
}
