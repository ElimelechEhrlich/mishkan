import { useMemo } from 'react';
import { labels } from '../constants/labels';
import { remainingOf } from '../lib/debts';
import { formatMoney } from '../lib/format';
import { todayIso } from '../lib/itemRules';
import { otherGroups } from '../lib/todayBrief';
import type { OtherGroup } from '../lib/todayBrief';
import type { Item } from '../types/domain';
import { useDebts } from './useDebts';

/** What a line ends with: a debt's balance, a value, or how many steps an issue has open. */
export type OtherMeta = { readonly text: string; readonly tone: 'alert' | 'primary' | 'muted' };

export type UseOtherItems = {
  readonly groups: Record<OtherGroup, readonly Item[]>;
  readonly meta: ReadonlyMap<string, OtherMeta>;
  readonly error: string | null;
};

/** The home page's items with no time of their own, by kind, each with what its line shows. */
export function useOtherItems(assigned: readonly Item[], steps: readonly Item[]): UseOtherItems {
  const debts = useDebts(assigned);
  const groups = useMemo(() => otherGroups(assigned, todayIso()), [assigned]);

  const meta = useMemo(() => {
    const found = new Map<string, OtherMeta>();
    for (const issue of groups.issues) {
      const open = steps.filter(
        (step) => step.parent_id === issue.id && step.kind === 'task' && step.status === 'open',
      ).length;
      if (open > 0) {
        found.set(issue.id, { text: labels.today.openSteps(open), tone: 'muted' });
      }
    }
    for (const note of groups.notes) {
      if (note.is_value && note.answer !== null && note.answer.trim() !== '') {
        found.set(note.id, { text: note.answer, tone: 'muted' });
      }
    }
    for (const debt of [...debts.weOwe, ...debts.owedToUs]) {
      found.set(debt.item.id, {
        text: formatMoney(remainingOf(debt.details, debt.paid)),
        tone: debt.details.direction === 'we_owe' ? 'alert' : 'primary',
      });
    }
    return found;
  }, [groups, steps, debts.weOwe, debts.owedToUs]);

  return { groups, meta, error: debts.error };
}
