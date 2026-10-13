import type { DeviceSubscription } from '../lib/push';
import { supabase } from '../lib/supabase';

/** Saves this device for the signed-in parent, so reminders reach it. */
export async function saveSubscription(device: DeviceSubscription): Promise<void> {
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: device.endpoint,
    p_p256dh: device.p256dh,
    p_auth: device.auth,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** The parents of the household who have notifications on in at least one device. */
export async function listMembersWithPush(): Promise<string[]> {
  const { data, error } = await supabase.rpc('members_with_push');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** Which parents get the automatic birthday and anniversary reminders; null for everyone. */
export async function setAutoReminderRecipients(
  memberIds: readonly string[] | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_auto_reminder_recipients', {
    p_member_ids: memberIds === null ? null : [...memberIds],
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Puts a reminder off for this parent alone: it rings again on their devices at `remindAt`.
 * A later choice for the same item replaces it.
 */
export async function snoozeReminder(
  itemId: string,
  memberId: string,
  remindAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('reminder_snoozes')
    .upsert({ item_id: itemId, member_id: memberId, remind_at: remindAt });
  if (error !== null) {
    throw new Error(error.message);
  }
}
