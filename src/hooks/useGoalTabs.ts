import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { labels } from '../constants/labels';
import { toListEntries } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Item } from '../types/domain';
import { useOpenSegments } from './useOpenSegments';
import type { UseOpenSegments } from './useOpenSegments';

export type GoalTab = 'goals' | 'issues';

export type UseGoalTabs = {
  readonly tab: GoalTab;
  readonly setTab: (tab: GoalTab) => void;
  /** Goals and issues, each with how many are open. */
  readonly options: readonly {
    readonly value: GoalTab;
    readonly label: string;
    readonly count: number;
  }[];
  /** Goals by their time: active, waiting, someday. */
  readonly goals: UseOpenSegments;
  /** Issues, dated by their open steps only. */
  readonly issues: readonly ListEntry[];
};

/** The goals page: goals and issues apart, each in a tab of its own. */
export function useGoalTabs(open: readonly Item[], steps: readonly Item[]): UseGoalTabs {
  // The overview's issues card opens straight on the issues tab.
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<GoalTab>(
    searchParams.get('tab') === 'issues' ? 'issues' : 'goals',
  );
  const goalItems = useMemo(() => open.filter((item) => item.kind === 'goal'), [open]);
  const issueItems = useMemo(() => open.filter((item) => item.kind === 'issue'), [open]);
  const goals = useOpenSegments(goalItems, steps);
  const issues = useMemo(() => toListEntries(issueItems, steps), [issueItems, steps]);

  return {
    tab,
    setTab,
    options: [
      { value: 'goals', label: labels.goals.goalsTab, count: goalItems.length },
      { value: 'issues', label: labels.goals.issuesTab, count: issueItems.length },
    ],
    goals,
    issues,
  };
}
