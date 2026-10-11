import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { WeekSummary } from '../../hooks/useWeekSummary';
import { OverviewCard } from './OverviewCard';

type WeekSummaryCardProps = {
  readonly summary: WeekSummary;
  readonly overdue: number;
  readonly thisWeek: number;
};

/** The week at a glance: what was done in the last seven days, what is late, what is coming. */
export function WeekSummaryCard({
  summary,
  overdue,
  thisWeek,
}: WeekSummaryCardProps): ReactElement {
  const line = `${labels.week.done} ${String(summary.doneCount)}${labels.item.separator}${labels.week.coming} ${String(thisWeek)}`;
  const stats = [
    { label: labels.week.doneThisWeek, value: summary.doneCount, alert: false },
    { label: labels.week.late, value: overdue, alert: overdue > 0 },
    { label: labels.week.comingWeek, value: thisWeek, alert: false },
  ];

  return (
    <OverviewCard
      icon="done"
      title={labels.week.title}
      summary={line}
      to="/done"
      linkLabel={labels.week.allDone}
    >
      <ul className="flex flex-col">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="flex items-center justify-between border-t border-line px-3.5 py-2.5 first:border-t-0"
          >
            <span className="text-[15px]">{stat.label}</span>
            <span className={`font-display text-lg font-bold ${stat.alert ? 'text-alert' : ''}`}>
              {String(stat.value)}
            </span>
          </li>
        ))}
      </ul>
      {summary.byMember.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-line px-3.5 py-3">
          <span className="text-xs font-bold tracking-wide text-muted">{labels.week.byWhom}</span>
          {summary.byMember.map((member) => (
            <div key={member.name} className="flex items-center gap-2.5">
              <span className="w-16 shrink-0 truncate text-[13px]">{member.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${String(Math.round((member.count / Math.max(summary.doneCount, 1)) * 100))}%`,
                  }}
                />
              </span>
              <span className="w-6 text-end text-[13px] font-semibold">{String(member.count)}</span>
            </div>
          ))}
        </div>
      ) : (
        summary.doneCount === 0 && (
          <p className="border-t border-line px-3.5 py-3 text-[13px] text-muted">
            {labels.week.nothingDone}
          </p>
        )
      )}
    </OverviewCard>
  );
}
