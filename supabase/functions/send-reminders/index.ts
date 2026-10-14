// Supabase Edge Function: sends the reminders that are due as web push notifications, and
// twice a day a nudge to parents whose "needs completion" list is not empty, and every
// morning a look at what is late or due today.
// A cron job calls it every few minutes. It needs three secrets: VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY and VAPID_SUBJECT (a mailto: address). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

type Device = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type DueReminder = Device & {
  item_id: string;
  title: string;
};

type DueNudge = Device & {
  waiting: number;
};

type DueToday = Device & {
  overdue: number;
  due_today: number;
};

/** The morning look's title and line, by how many items are due today and late. */
function todayMessage(dueToday: number, overdue: number): { title: string; body: string } {
  const total = dueToday + overdue;
  return {
    title: total === 1 ? 'דבר אחד להיום' : `${String(total)} דברים להיום`,
    body:
      overdue === 0
        ? 'לחיצה פותחת את מסך היום'
        : overdue === 1
          ? 'מתוכם אחד באיחור'
          : `מתוכם ${String(overdue)} באיחור`,
  };
}

/** The nudge's title, by how many items wait to be completed. */
function nudgeTitle(waiting: number): string {
  return waiting === 1 ? 'פריט אחד מחכה להשלמה' : `${String(waiting)} פריטים מחכים להשלמה`;
}

/** A secret as saved in Supabase, forgiving spaces, quotes and '=' padding pasted along with it. */
function secret(name: string): string {
  const value = (Deno.env.get(name) ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
  if (value === '') {
    throw new Error(`missing secret ${name}`);
  }
  return name.startsWith('VAPID_') && name !== 'VAPID_SUBJECT' ? value.replace(/=+$/, '') : value;
}

type Message = {
  readonly device: Device;
  readonly payload: Record<string, unknown>;
  /** For an item's own reminder: tried again on the next run if it could not be sent at all. */
  readonly itemId?: string;
};

type Outcome = {
  sent: number;
  readonly gone: string[];
  /** Items whose reminder reached none of their devices for a passing reason. */
  readonly retry: Set<string>;
};

/** Sends each message, noting devices that are gone and reminders worth trying again. */
async function sendAll(messages: readonly Message[], outcome: Outcome): Promise<void> {
  const reached = new Set<string>();
  const failed = new Set<string>();
  await Promise.all(
    messages.map(async ({ device, payload, itemId }) => {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 },
        );
        outcome.sent += 1;
        if (itemId !== undefined) {
          reached.add(itemId);
        }
      } catch (caught) {
        // 404 and 410 mean the device turned notifications off or was reset.
        const status = (caught as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          outcome.gone.push(device.endpoint);
          return;
        }
        console.error('push failed', status, String(caught));
        // No answer, too many requests or a server error pass; anything else would fail again.
        const passing = status === undefined || status === 429 || status >= 500;
        if (passing && itemId !== undefined) {
          failed.add(itemId);
        }
      }
    }),
  );
  for (const itemId of failed) {
    if (!reached.has(itemId)) {
      outcome.retry.add(itemId);
    }
  }
}

Deno.serve(async () => {
  try {
    webpush.setVapidDetails(
      secret('VAPID_SUBJECT'),
      secret('VAPID_PUBLIC_KEY'),
      secret('VAPID_PRIVATE_KEY'),
    );
    const supabase = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'));
    const outcome: Outcome = { sent: 0, gone: [], retry: new Set() };
    const errors: string[] = [];
    const counts = { due: 0, snoozed: 0, nudges: 0, mornings: 0 };

    // Each kind is claimed and sent before the next is claimed, so a failure in one kind
    // never loses what another already claimed (claiming marks it as sent).
    const reminders = await supabase.rpc('claim_due_reminders');
    if (reminders.error !== null) {
      errors.push(reminders.error.message);
    } else {
      const due: DueReminder[] = reminders.data ?? [];
      counts.due = due.length;
      await sendAll(
        due.map((reminder) => ({
          device: reminder,
          itemId: reminder.item_id,
          payload: {
            title: reminder.title,
            body: 'תזכורת ממשכן',
            url: `/item/${reminder.item_id}`,
            // Gives the notification its open and remind-again buttons.
            itemId: reminder.item_id,
          },
        })),
        outcome,
      );
    }

    // Reminders a parent put off for themselves go to that parent alone, like any reminder.
    const snoozed = await supabase.rpc('claim_due_snoozes');
    if (snoozed.error !== null) {
      errors.push(snoozed.error.message);
    } else {
      const due: DueReminder[] = snoozed.data ?? [];
      counts.snoozed = due.length;
      await sendAll(
        due.map((reminder) => ({
          device: reminder,
          payload: {
            title: reminder.title,
            body: 'תזכורת ממשכן',
            url: `/item/${reminder.item_id}`,
            itemId: reminder.item_id,
          },
        })),
        outcome,
      );
    }

    const nudged = await supabase.rpc('claim_completion_nudges');
    if (nudged.error !== null) {
      errors.push(nudged.error.message);
    } else {
      const nudges: DueNudge[] = nudged.data ?? [];
      counts.nudges = nudges.length;
      await sendAll(
        nudges.map((nudge) => ({
          device: nudge,
          payload: {
            title: nudgeTitle(nudge.waiting),
            body: 'כדאי להיכנס למשכן ולהשלים את מה שחסר',
            url: '/incomplete',
            tag: 'completion',
          },
        })),
        outcome,
      );
    }

    const looked = await supabase.rpc('claim_today_nudges');
    if (looked.error !== null) {
      errors.push(looked.error.message);
    } else {
      const mornings: DueToday[] = looked.data ?? [];
      counts.mornings = mornings.length;
      await sendAll(
        mornings.map((morning) => ({
          device: morning,
          payload: {
            ...todayMessage(morning.due_today, morning.overdue),
            url: '/today',
            tag: 'today',
          },
        })),
        outcome,
      );
    }

    // A reminder that reached no device for a passing reason is due again for the next run.
    for (const itemId of outcome.retry) {
      const released = await supabase.rpc('release_reminder', { p_item_id: itemId });
      if (released.error !== null) {
        errors.push(released.error.message);
      }
    }

    if (outcome.gone.length > 0) {
      const removed = await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', outcome.gone);
      if (removed.error !== null) {
        errors.push(removed.error.message);
      }
    }

    const result = {
      ...counts,
      sent: outcome.sent,
      retried: outcome.retry.size,
      removed: outcome.gone.length,
      errors,
    };
    console.log('send-reminders', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      status: errors.length === 0 ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (caught) {
    console.error(String(caught));
    return new Response(JSON.stringify({ error: String(caught) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
