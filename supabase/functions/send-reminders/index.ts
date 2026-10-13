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

Deno.serve(async () => {
  try {
    webpush.setVapidDetails(
      secret('VAPID_SUBJECT'),
      secret('VAPID_PUBLIC_KEY'),
      secret('VAPID_PRIVATE_KEY'),
    );
    const supabase = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'));

    const { data, error } = await supabase.rpc('claim_due_reminders');
    if (error !== null) {
      throw new Error(error.message);
    }
    const reminders: DueReminder[] = data ?? [];

    const nudged = await supabase.rpc('claim_completion_nudges');
    if (nudged.error !== null) {
      throw new Error(nudged.error.message);
    }
    const nudges: DueNudge[] = nudged.data ?? [];

    const looked = await supabase.rpc('claim_today_nudges');
    if (looked.error !== null) {
      throw new Error(looked.error.message);
    }
    const mornings: DueToday[] = looked.data ?? [];

    const messages = [
      ...reminders.map((reminder) => ({
        device: reminder,
        payload: {
          title: reminder.title,
          body: 'תזכורת ממשכן',
          url: `/item/${reminder.item_id}`,
          // Gives the notification its open and remind-again buttons.
          itemId: reminder.item_id,
        },
      })),
      ...nudges.map((nudge) => ({
        device: nudge,
        payload: {
          title: nudgeTitle(nudge.waiting),
          body: 'כדאי להיכנס למשכן ולהשלים את מה שחסר',
          url: '/incomplete',
          tag: 'completion',
        },
      })),
      ...mornings.map((morning) => ({
        device: morning,
        payload: {
          ...todayMessage(morning.due_today, morning.overdue),
          url: '/today',
          tag: 'today',
        },
      })),
    ];

    let sent = 0;
    const gone: string[] = [];
    await Promise.all(
      messages.map(async ({ device, payload }) => {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 12 },
          );
          sent += 1;
        } catch (caught) {
          // 404 and 410 mean the device turned notifications off or was reset.
          const status = (caught as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            gone.push(device.endpoint);
          } else {
            console.error('push failed', status, String(caught));
          }
        }
      }),
    );

    if (gone.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', gone);
    }

    const result = {
      due: reminders.length,
      nudges: nudges.length,
      mornings: mornings.length,
      sent,
      removed: gone.length,
    };
    console.log('send-reminders', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
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
