import { supabase } from '../lib/supabase';
import type { DebtPayment } from '../types/domain';

/** How much was paid of each debt, by item id. */
export async function listDebtPaid(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('debt_paid').select('*');
  if (error !== null) {
    throw new Error(error.message);
  }
  return new Map(data.map((row) => [row.item_id, row.paid]));
}

/** A debt's payments, newest first. */
export async function listDebtPayments(itemId: string): Promise<DebtPayment[]> {
  const { data, error } = await supabase
    .from('debt_payments')
    .select('*')
    .eq('item_id', itemId)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function addDebtPayment(
  itemId: string,
  payment: { readonly amount: number; readonly paidOn: string; readonly note: string | null },
): Promise<void> {
  const { error } = await supabase.from('debt_payments').insert({
    item_id: itemId,
    amount: payment.amount,
    paid_on: payment.paidOn,
    note: payment.note,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function removeDebtPayment(paymentId: string): Promise<void> {
  const { error } = await supabase.from('debt_payments').delete().eq('id', paymentId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Records this month's payment of the plan. Returns the payment's id, to take it back. */
export async function payDebtMonth(itemId: string): Promise<string> {
  const { data, error } = await supabase.rpc('pay_debt_month', { p_item_id: itemId });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}
