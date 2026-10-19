import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { planResult, remainingOf } from '../../lib/debts';
import type { PlanDraft, PlanResult } from '../../lib/debts';
import { entryNumber } from '../../lib/trackers';
import type { DebtDetails } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { TextField } from '../ui/TextField';
import { PlanSummary } from './PlanSummary';

type DebtPlanFormProps = {
  readonly debt: DebtDetails;
  /** How much was paid so far. */
  readonly paid: number;
  readonly onSave: (plan: PlanResult, day: number) => void;
  readonly onCancel: () => void;
};

function numberOf(text: string): number {
  return entryNumber(text) ?? Number.NaN;
}

/**
 * A monthly plan: a sum each month, or a number of payments (with interest, from the bank's
 * monthly payment or from the yearly rate), and its day (1 to 28, so every month has it).
 */
export function DebtPlanForm({ debt, paid, onSave, onCancel }: DebtPlanFormProps): ReactElement {
  const [by, setBy] = useState<'month' | 'count'>('month');
  const [monthlyText, setMonthlyText] = useState(
    debt.monthly_amount === null ? '' : String(debt.monthly_amount),
  );
  const [countText, setCountText] = useState('');
  const [interest, setInterest] = useState(debt.repay_total !== null);
  const [rateText, setRateText] = useState('');
  const [planDay, setPlanDay] = useState(debt.monthly_day ?? 10);
  const rate = numberOf(rateText);
  const draft: PlanDraft =
    by === 'month'
      ? { by, monthly: numberOf(monthlyText) }
      : interest
        ? {
            by,
            count: numberOf(countText),
            interest,
            monthly: numberOf(monthlyText),
            yearlyPercent: Number.isFinite(rate) && rate >= 0 ? rate : null,
          }
        : { by, count: numberOf(countText), interest };
  const plan = planResult(draft, debt, paid);
  const owed = plan === null ? null : remainingOf({ ...debt, repay_total: plan.repayTotal }, paid);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (plan !== null) {
      onSave(plan, planDay);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-paper p-3">
      <Segmented
        compact
        options={[
          { value: 'month', label: labels.debts.planByMonth },
          { value: 'count', label: labels.debts.planByCount },
        ]}
        value={by}
        onChange={setBy}
      />
      {by === 'month' ? (
        <TextField
          label={labels.debts.planAmount}
          value={monthlyText}
          onChange={setMonthlyText}
          type="number"
          compact
          autoFocus
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <TextField
              label={labels.debts.planCount}
              value={countText}
              onChange={setCountText}
              type="number"
              compact
              autoFocus
            />
            <Chip
              label={labels.debts.hasInterest}
              selected={interest}
              outline
              onClick={() => {
                setInterest(!interest);
              }}
            />
          </div>
          {interest && (
            <div className="flex gap-2">
              <TextField
                label={labels.debts.bankMonthly}
                value={
                  draft.by === 'count' && draft.interest && draft.yearlyPercent !== null
                    ? String(plan?.monthly ?? '')
                    : monthlyText
                }
                onChange={(text) => {
                  setRateText('');
                  setMonthlyText(text);
                }}
                type="number"
              />
              <TextField
                label={labels.debts.yearlyRate}
                value={rateText}
                onChange={setRateText}
                type="number"
              />
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] text-muted">{labels.debts.planDay}</span>
        <Stepper value={planDay} min={1} max={28} onChange={setPlanDay} />
      </div>
      {plan !== null && owed !== null && owed > 0 && (
        <PlanSummary
          monthly={plan.monthly}
          left={owed}
          amount={debt.amount}
          repayTotal={plan.repayTotal}
        />
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={plan === null}>
          {labels.actions.save}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {labels.actions.cancel}
        </Button>
      </div>
    </form>
  );
}
