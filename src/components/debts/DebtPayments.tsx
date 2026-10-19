import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useDebtPayments } from '../../hooks/useDebtPayments';
import {
  monthLabel,
  monthNeeds,
  owedOf,
  planMonths,
  planStartFrom,
  remainingOf,
} from '../../lib/debts';
import { formatMoney } from '../../lib/format';
import { formatTimestampDate, todayIso } from '../../lib/itemRules';
import type { DebtChanges, DebtDetails, Item } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { DebtPaymentForm } from './DebtPaymentForm';
import { DebtPlanForm } from './DebtPlanForm';
import { PlanSummary } from './PlanSummary';

type DebtPaymentsProps = {
  readonly item: Item;
  readonly debt: DebtDetails;
  readonly onChange: (changes: DebtChanges) => void;
  /** Closes the debt, once it is paid. */
  readonly onClose: () => void;
};

/**
 * What was paid of a debt and what is left: its payments, a monthly plan with its months, and,
 * once nothing is left, an offer to close it.
 */
export function DebtPayments({ item, debt, onChange, onClose }: DebtPaymentsProps): ReactElement {
  const payments = useDebtPayments(item.id);
  const [form, setForm] = useState<'payment' | 'plan' | null>(null);
  const today = todayIso();
  const owed = owedOf(debt);
  const left = remainingOf(debt, payments.paid);
  const hasPlan = debt.monthly_amount !== null && debt.monthly_day !== null;
  const months = planMonths(debt, payments.payments, today, item.due_date);
  const dueMonth = item.due_date === null ? null : `${item.due_date.slice(0, 8)}01`;
  const dueNeeds =
    dueMonth === null || debt.monthly_amount === null
      ? 0
      : monthNeeds(debt.monthly_amount, payments.payments, dueMonth, left);
  const openMonths = months
    .filter((month) => month.state === 'open')
    .map((month) => ({ month: month.month, label: monthLabel(month.month, today) }));

  return (
    <Card title={labels.debts.payments}>
      <ErrorBanner message={payments.error} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] text-muted">{labels.debts.left}</span>
          <span className="font-display text-2xl font-bold tabular-nums">{formatMoney(left)}</span>
        </div>
        {payments.paid > 0 && (
          <>
            <span className="h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-primary"
                style={{
                  width: `${String(Math.min(100, (payments.paid / owed) * 100))}%`,
                }}
              />
            </span>
            <span className="text-[13px] text-muted">
              {labels.debts.paidOf(formatMoney(payments.paid), formatMoney(owed))}
            </span>
          </>
        )}
      </div>

      {left === 0 && item.status === 'open' && (
        <div className="flex items-center gap-3 rounded-xl bg-primary-soft p-3">
          <p className="flex-1 text-[14px] font-semibold text-primary">{labels.debts.paidOff}</p>
          <Button variant="soft" onClick={onClose}>
            {labels.actions.closeDebt}
          </Button>
        </div>
      )}

      {/* The monthly plan, its months, and the payment due now. */}
      {hasPlan && form !== 'plan' && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <Icon name="repeat" className="size-4 text-primary" />
            <span className="flex-1 text-[14px] font-medium">
              {labels.debts.perMonth(formatMoney(debt.monthly_amount ?? 0), debt.monthly_day ?? 1)}
            </span>
            <IconButton
              icon="edit"
              label={labels.debts.plan}
              onClick={() => {
                setForm('plan');
              }}
            />
          </div>
          {left > 0 && (
            <PlanSummary
              monthly={debt.monthly_amount ?? 1}
              left={left}
              amount={debt.amount}
              repayTotal={debt.repay_total}
            />
          )}
          {months.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {months.map((month) => (
                <span
                  key={month.month}
                  className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium ${
                    month.state === 'paid'
                      ? 'bg-primary-soft text-primary'
                      : month.state === 'skipped'
                        ? 'bg-paper text-muted line-through decoration-muted/50'
                        : month.late
                          ? 'bg-alert-soft text-alert'
                          : 'bg-paper text-muted'
                  }`}
                >
                  {month.state === 'paid' && <Icon name="check" className="size-3" />}
                  {monthLabel(month.month, today)}
                  <span className="opacity-70">
                    {month.state === 'skipped'
                      ? labels.debts.monthSkipped
                      : month.state === 'open' && month.paid > 0
                        ? labels.debts.monthPart(
                            formatMoney((debt.monthly_amount ?? 0) - month.paid),
                          )
                        : month.state === 'open'
                          ? month.late
                            ? labels.debts.monthLate
                            : labels.debts.monthDue
                          : ''}
                  </span>
                </span>
              ))}
            </div>
          )}
          {dueMonth !== null && dueNeeds > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="soft" disabled={payments.busy} onClick={payments.payMonth}>
                <Icon name="check" className="size-4.5" />
                {labels.debts.payMonth(monthLabel(dueMonth, today), formatMoney(dueNeeds))}
              </Button>
              <button
                type="button"
                disabled={payments.busy}
                onClick={payments.skipMonth}
                className="min-h-9 rounded-full px-3 text-[13px] font-medium text-muted transition active:scale-[0.97]"
              >
                {labels.debts.skipMonth}
              </button>
            </div>
          )}
        </div>
      )}
      {form === 'plan' && (
        <DebtPlanForm
          debt={debt}
          paid={payments.paid}
          onSave={(plan, day) => {
            // A new day starts the plan over from the next time that day comes.
            onChange({
              monthly_amount: plan.monthly,
              repay_total: plan.repayTotal,
              monthly_day: day,
              plan_starts:
                hasPlan && day === debt.monthly_day && debt.plan_starts !== null
                  ? debt.plan_starts
                  : planStartFrom(day, today),
            });
            setForm(null);
          }}
          onCancel={() => {
            setForm(null);
          }}
        />
      )}
      {form === 'plan' && hasPlan && (
        <button
          type="button"
          onClick={() => {
            onChange({
              monthly_amount: null,
              monthly_day: null,
              plan_starts: null,
              repay_total: null,
            });
            setForm(null);
          }}
          className="self-start text-[13px] font-medium text-alert"
        >
          {labels.debts.stopPlan}
        </button>
      )}

      {form === 'payment' ? (
        <DebtPaymentForm
          months={openMonths}
          dueMonth={dueMonth}
          onAdd={(amount, paidOn, note, forMonth) => {
            payments.add(amount, paidOn, note, forMonth);
            setForm(null);
          }}
          onCancel={() => {
            setForm(null);
          }}
        />
      ) : (
        form === null && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setForm('payment');
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-soft px-3.5 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
            >
              <Icon name="plus" className="size-4" />
              {labels.debts.addPayment}
            </button>
            {!hasPlan && (
              <button
                type="button"
                onClick={() => {
                  setForm('plan');
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface px-3.5 text-[13px] font-medium text-primary shadow-card transition active:scale-[0.97]"
              >
                <Icon name="repeat" className="size-4" />
                {labels.debts.addPlan}
              </button>
            )}
          </div>
        )
      )}

      {payments.payments.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {payments.payments.map((payment) => (
            <li key={payment.id} className="flex items-center gap-3 py-1.5">
              <span className="w-16 shrink-0 text-[13px] text-muted tabular-nums">
                {formatTimestampDate(`${payment.paid_on}T12:00:00`)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                {payment.for_month === null
                  ? (payment.note ?? '')
                  : payment.skipped
                    ? labels.debts.skippedMonth(monthLabel(payment.for_month, today))
                    : labels.debts.forMonth(monthLabel(payment.for_month, today))}
              </span>
              {!payment.skipped && (
                <span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
              )}
              <IconButton
                icon="close"
                label={labels.actions.delete}
                onClick={() => {
                  payments.remove(payment.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
