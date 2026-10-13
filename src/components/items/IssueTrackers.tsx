import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { trackerLine } from '../../lib/trackers';
import type { Item, TrackerEntry } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { Icon } from '../ui/Icon';

type IssueTrackersProps = {
  /** The trackers inside one issue. */
  readonly trackers: readonly Item[];
  readonly entries: ReadonlyMap<string, readonly TrackerEntry[]>;
  readonly onAdd: (title: string) => void;
};

/** The trackers of an issue, each with its summing up, opening to its own page. */
export function IssueTrackers({ trackers, entries, onAdd }: IssueTrackersProps): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {trackers.length === 0 && <p className="text-sm text-muted">{labels.tracker.noTrackers}</p>}
      {trackers.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {trackers.map((tracker) => {
            const own = entries.get(tracker.id) ?? [];
            const line = trackerLine(tracker.tracker_summary, tracker.tracker_unit, own);
            return (
              <li key={tracker.id}>
                <Link
                  to={`/item/${tracker.id}`}
                  className="flex items-center gap-3 py-2.5 active:opacity-70"
                >
                  <span className="min-w-0 flex-1 text-[15px] font-medium break-words">
                    {tracker.title}
                  </span>
                  <span className="text-sm font-semibold">
                    {line?.value ?? `${String(own.length)} ${labels.tracker.entryCount}`}
                  </span>
                  <Icon name="forward" className="size-4 text-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <AddRow label={labels.tracker.newTracker} onAdd={onAdd} />
    </div>
  );
}
