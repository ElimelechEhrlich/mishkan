// Supabase Edge Function: the assistant. A parent writes a message in the app; Gemini reads it
// with the conversation so far, uses the tools below to look at and add to the household's
// items, and answers in Hebrew. Every read and write goes through the parent's own sign-in,
// so the database's rules apply as in the app: the parent sees and changes only what they may.
// It needs one secret, GEMINI_API_KEY (from Google AI Studio), and should have ASSISTANT_HOUSEHOLDS:
// the household ids
// (comma-separated) it serves, since its cost is the owner's; without it, it serves no one.
// GEMINI_MODEL may name another model (for example, one the free tier offers), and
// GEMINI_FALLBACK_MODEL the one asked when its daily quota is used up (a lighter model with a
// larger free quota; "none" turns this off).
// SUPABASE_URL and SUPABASE_ANON_KEY are provided.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.50.0';

/** The model, unless GEMINI_MODEL names another. */
const defaultModel = 'gemini-3.5-flash';
/**
 * Asked once the model's quota is used up, unless GEMINI_FALLBACK_MODEL names another: lighter,
 * with 500 requests a day on the free tier instead of 20.
 */
const defaultFallbackModel = 'gemini-3.5-flash-lite';
/** Earlier turns of the conversation sent along, so it follows what was said. */
const historyTurns = 20;
/** Tool rounds in one answer, at most. */
const maxRounds = 6;
/** Rows a list returns at most, so a long list does not fill the request. */
const maxRows = 60;
const timeZone = 'Asia/Jerusalem';
/** Messages one parent can send in a day, a guard on the cost. */
const dailyLimit = 150;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Row = Record<string, unknown>;

/** A piece of a Gemini message: text, a call the model makes, or the answer to one. */
type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name: string; args?: Row };
  functionResponse?: { id?: string; name: string; response: Row };
};

type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Today's date where the household lives, as YYYY-MM-DD. */
function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A local date and hour ("2026-10-20T16:30") as the moment it is, in UTC. */
function localToUtc(localDateTime: string): string {
  const guess = new Date(`${localDateTime}:00Z`);
  const offset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(guess)
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset ?? '');
  const minutes =
    match === null ? 0 : (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(guess.getTime() - minutes * 60000).toISOString();
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** What the model may do, as Gemini function declarations. */
const tools = [
  {
    name: 'list_items',
    description:
      'Lists open items of the household. Use it to answer what there is to do, what is late, what is on the shopping list, what waits to be completed, or to find an item before acting on it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        section: {
          type: 'STRING',
          format: 'enum',
          enum: [
            'overdue',
            'today',
            'week',
            'upcoming',
            'undated',
            'waiting',
            'someday',
            'incomplete',
            'shopping',
            'all',
          ],
          description:
            'overdue: date passed. today: due today or urgent. week: the next 7 days after today. upcoming: later. undated: no date. waiting / someday: put aside. incomplete: missing a domain or a time. shopping: the shopping list. all: everything open.',
        },
        kind: {
          type: 'STRING',
          format: 'enum',
          enum: ['task', 'appointment', 'goal', 'issue', 'note', 'tracker', 'missing_item', 'debt'],
        },
        entity_id: { type: 'STRING', description: 'Only the items of this entity.' },
        search: { type: 'STRING', description: 'Words that must appear in the title.' },
      },
      required: ['section'],
    },
  },
  {
    name: 'add_item',
    description:
      'Adds an item of any kind but a debt or a shopping item: a task (or a step of a goal or an issue, with parent_id), an appointment, a goal, an issue, a note, a value ("נתון": a name and one value), or a tracker. Give a domain_id when the right domain is clear from the household list; when it is not, ask, or leave it out and the item waits in "להשלמה" to be completed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        kind: {
          type: 'STRING',
          format: 'enum',
          enum: ['task', 'appointment', 'goal', 'issue', 'note', 'value', 'tracker'],
        },
        parent_id: {
          type: 'STRING',
          description:
            'For a step: the id of its goal or issue (find it with list_items). The kind is then task.',
        },
        value: {
          type: 'STRING',
          description: 'For a value ("נתון"): the value itself, such as the code.',
        },
        target_date: {
          type: 'STRING',
          description: 'For a goal: YYYY-MM-DD, by when all its steps are to be done.',
        },
        unit: { type: 'STRING', description: 'For a tracker: its unit, such as ₪ or ק"ג.' },
        summary: {
          type: 'STRING',
          format: 'enum',
          enum: ['sum', 'latest', 'none'],
          description:
            'For a tracker: sum adds up the entries (expenses), latest shows the last one (weight).',
        },
        domain_id: { type: 'STRING' },
        entity_id: {
          type: 'STRING',
          description: 'The entity, when known but its domain is not.',
        },
        date: {
          type: 'STRING',
          description: 'YYYY-MM-DD. For a task: its day. Required for an appointment.',
        },
        time: { type: 'STRING', description: 'HH:MM, 24-hour. Required for an appointment.' },
        urgent: {
          type: 'BOOLEAN',
          description:
            'A task to do as soon as possible, with no date. A task with no date is urgent anyway.',
        },
        no_date: {
          type: 'BOOLEAN',
          description:
            'A task or goal with no date and not urgent ("ללא מועד"): only when the parent says so, such as "מתי שיהיה" or "בלי לחץ".',
        },
        place: { type: 'STRING', description: 'Where an appointment is.' },
        notes: { type: 'STRING' },
      },
      required: ['title', 'kind'],
    },
  },
  {
    name: 'add_debt',
    description:
      'Records a debt: who, how much, and which way ("owed_to_us": they owe us; "we_owe": we owe them). If the way is not clear, ask.',
    parameters: {
      type: 'OBJECT',
      properties: {
        counterparty: { type: 'STRING', description: 'Who: a person or a place.' },
        amount: { type: 'NUMBER', description: 'In shekels.' },
        direction: { type: 'STRING', format: 'enum', enum: ['owed_to_us', 'we_owe'] },
        domain_id: { type: 'STRING' },
        entity_id: { type: 'STRING' },
      },
      required: ['counterparty', 'amount', 'direction'],
    },
  },
  {
    name: 'add_to_shopping',
    description: "Adds things to buy to the household's shared shopping list, one title per thing.",
    parameters: {
      type: 'OBJECT',
      properties: {
        titles: { type: 'ARRAY', items: { type: 'STRING' } },
        category: {
          type: 'STRING',
          format: 'enum',
          enum: ['food', 'clothing', 'urgent', 'planned'],
          description: 'food is the supermarket ("סופר"), the usual one.',
        },
      },
      required: ['titles'],
    },
  },
  {
    name: 'add_reminder',
    description:
      "Adds a reminder to an item (find its id with list_items first). Either minutes before the item's own time, or at a given local date and time.",
    parameters: {
      type: 'OBJECT',
      properties: {
        item_id: { type: 'STRING' },
        minutes_before: { type: 'INTEGER' },
        at: { type: 'STRING', description: 'YYYY-MM-DDTHH:MM, local time.' },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'complete_item',
    description:
      'Marks an item done (for a repeating item: this time). Before it, ask the user to confirm, naming the item; call with confirmed true only after they agreed in their last message.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item_id: { type: 'STRING' },
        confirmed: { type: 'BOOLEAN', description: 'True only after the user said yes.' },
      },
      required: ['item_id', 'confirmed'],
    },
  },
  {
    name: 'update_item',
    description:
      'Changes an item: its title, its day, its hour, makes it urgent or with no date, or moves it to another domain or entity. Find its id with list_items first. For the time of a repeating item give scope: this_time moves only the current time (a day and/or hour), from_now changes the hour or the weekdays of every time from now. When it is not clear which, ask the parent "רק הפעם, או מעכשיו בכל פעם?" before calling.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item_id: { type: 'STRING' },
        title: { type: 'STRING' },
        date: { type: 'STRING', description: 'YYYY-MM-DD, the new day.' },
        time: { type: 'STRING', description: 'HH:MM, the new hour.' },
        urgent: { type: 'BOOLEAN', description: 'Make it urgent, with no date.' },
        no_date: { type: 'BOOLEAN', description: 'Take its date away (no date).' },
        scope: {
          type: 'STRING',
          enum: ['this_time', 'from_now'],
          description: 'For a repeating item: only this time, or every time from now.',
        },
        weekdays: {
          type: 'ARRAY',
          items: { type: 'INTEGER' },
          description:
            'With scope from_now, for a weekly item: its new days, 0 = Sunday to 6 = Saturday.',
        },
        domain_id: {
          type: 'STRING',
          description: 'Move it to this domain (from the household list); the entity follows it.',
        },
        entity_id: {
          type: 'STRING',
          description:
            'Move it to this entity when no domain of it fits; it then waits in "להשלמה" for a domain. Prefer domain_id.',
        },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'add_entry',
    description:
      'Records an entry in a tracker (find the tracker id with list_items, kind tracker): a value, on a day (today if not said), with an optional note.',
    parameters: {
      type: 'OBJECT',
      properties: {
        item_id: { type: 'STRING' },
        value: { type: 'STRING', description: 'The number or value, such as 77.5 or 350.' },
        date: { type: 'STRING', description: 'YYYY-MM-DD; today if not given.' },
        note: { type: 'STRING' },
      },
      required: ['item_id', 'value'],
    },
  },
  {
    name: 'add_data',
    description:
      'Adds a row to a note or an issue (find its id with list_items): a line of text, or a name and a value ("מספר רישוי: 12-345-67").',
    parameters: {
      type: 'OBJECT',
      properties: {
        item_id: { type: 'STRING' },
        label: {
          type: 'STRING',
          description: 'The name, for a name and a value; leave out for a line of text.',
        },
        value: { type: 'STRING' },
      },
      required: ['item_id', 'value'],
    },
  },
  {
    name: 'add_question',
    description:
      'Adds an open question to an issue (find the issue id with list_items, kind issue).',
    parameters: {
      type: 'OBJECT',
      properties: {
        issue_id: { type: 'STRING' },
        question: { type: 'STRING' },
      },
      required: ['issue_id', 'question'],
    },
  },
  {
    name: 'list_done',
    description:
      'Lists what was marked done in the last days, for summaries ("what did we do this week").',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: { type: 'INTEGER', description: 'How many days back, 1 to 31.' },
      },
      required: ['days'],
    },
  },
];

/** Kinds that repeat by occurrences, as the app counts them. */
const repeatingKinds = new Set(['task', 'appointment', 'tracker', 'missing_item']);

type Household = {
  readonly householdId: string;
  readonly memberId: string;
  readonly memberName: string;
  /** Domain id to "entity · domain", for showing where an item is. */
  readonly places: Map<string, string>;
  readonly entityNames: Map<string, string>;
  /** The home's shopping domain. */
  readonly homeShopping: string | null;
  /** Every shopping domain, which holds missing items only. */
  readonly shoppingDomains: Set<string>;
  /** The household's entities and domains, as the model reads them. */
  readonly summary: string;
};

async function loadHousehold(db: SupabaseClient, userId: string): Promise<Household> {
  const [{ data: member }, { data: entities }, { data: domains }] = await Promise.all([
    db.from('members').select('id, name, household_id').eq('user_id', userId).single(),
    db.from('entities').select('id, name, kind').order('sort_order'),
    db.from('domains').select('id, name, role, entity_id').order('sort_order'),
  ]);
  const places = new Map<string, string>();
  const entityNames = new Map<string, string>();
  let homeShopping: string | null = null;
  const shoppingDomains = new Set<string>();
  const lines: string[] = [];
  for (const entity of (entities ?? []) as Row[]) {
    entityNames.set(String(entity.id), String(entity.name));
    const own = ((domains ?? []) as Row[]).filter((domain) => domain.entity_id === entity.id);
    for (const domain of own) {
      places.set(String(domain.id), `${String(entity.name)} · ${String(domain.name)}`);
      if (domain.role === 'shopping') {
        shoppingDomains.add(String(domain.id));
      }
      if (entity.kind === 'home' && domain.role === 'shopping') {
        homeShopping = String(domain.id);
      }
    }
    // Every domain, with what the debts and shopping ones are for.
    const roleNote: Record<string, string> = { debts: ' (debts)', shopping: ' (shopping list)' };
    lines.push(
      `- ${String(entity.name)} (${String(entity.kind)}, id ${String(entity.id)}): ` +
        (own.length === 0
          ? '(no domains yet)'
          : own
              .map(
                (domain) =>
                  `${String(domain.name)}${roleNote[String(domain.role)] ?? ''} [${String(domain.id)}]`,
              )
              .join(', ')),
    );
  }
  return {
    householdId: String((member as Row | null)?.household_id ?? ''),
    memberId: String((member as Row | null)?.id ?? ''),
    memberName: String((member as Row | null)?.name ?? ''),
    places,
    entityNames,
    homeShopping,
    shoppingDomains,
    summary: lines.join('\n'),
  };
}

async function listItems(db: SupabaseClient, house: Household, input: Row): Promise<string> {
  const today = localDate();
  const weekEnd = addDays(today, 7);
  const { data, error } = await db
    .from('items')
    .select(
      'id, title, kind, time_mode, due_date, due_time, starts_at, is_complete, domain_id, entity_id, run_id, parent_id, shopping_category, place, is_value, answer',
    )
    .eq('status', 'open')
    .neq('kind', 'question')
    .neq('kind', 'shopping_run')
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const section = String(input.section ?? 'all');
  const search = text(input.search)?.toLowerCase() ?? null;
  const rows = ((data ?? []) as Row[]).filter((item) => {
    const due = typeof item.due_date === 'string' ? item.due_date : null;
    if (input.kind !== undefined && item.kind !== input.kind) return false;
    if (input.entity_id !== undefined && item.entity_id !== input.entity_id) return false;
    if (search !== null && !String(item.title).toLowerCase().includes(search)) return false;
    switch (section) {
      case 'overdue':
        return (
          item.is_complete === true && due !== null && due < today && item.kind !== 'appointment'
        );
      case 'today':
        return item.is_complete === true && (due === today || item.time_mode === 'urgent');
      case 'week':
        return item.is_complete === true && due !== null && due > today && due <= weekEnd;
      case 'upcoming':
        return item.is_complete === true && due !== null && due > weekEnd;
      case 'undated':
        return item.is_complete === true && due === null && item.time_mode === 'anytime';
      case 'waiting':
      case 'someday':
        return item.time_mode === section;
      case 'incomplete':
        return item.is_complete !== true;
      case 'shopping':
        return item.kind === 'missing_item' && item.run_id === null;
      default:
        return true;
    }
  });
  if (rows.length === 0) {
    return 'nothing';
  }
  // A debt says how much and which way; a value, its value.
  const debtIds = rows.filter((item) => item.kind === 'debt').map((item) => String(item.id));
  const debts = new Map<string, string>();
  if (debtIds.length > 0) {
    const { data: details } = await db
      .from('debt_details')
      .select('item_id, amount, direction')
      .in('item_id', debtIds);
    for (const detail of (details ?? []) as Row[]) {
      debts.set(
        String(detail.item_id),
        `${String(detail.amount)} ₪ ${detail.direction === 'we_owe' ? 'we owe them' : 'they owe us'}`,
      );
    }
  }
  return rows
    .slice(0, maxRows)
    .map((item) => {
      const where =
        typeof item.domain_id === 'string'
          ? (house.places.get(item.domain_id) ?? '')
          : typeof item.entity_id === 'string'
            ? `${house.entityNames.get(item.entity_id) ?? ''} (no domain)`
            : '(no domain)';
      const when =
        typeof item.starts_at === 'string'
          ? new Intl.DateTimeFormat('en-CA', {
              timeZone,
              dateStyle: 'short',
              timeStyle: 'short',
              hourCycle: 'h23',
            }).format(new Date(item.starts_at))
          : [item.due_date, item.due_time, item.time_mode]
              .filter((part) => part !== null)
              .join(' ');
      const extra =
        item.kind === 'debt'
          ? (debts.get(String(item.id)) ?? '')
          : item.is_value === true && typeof item.answer === 'string'
            ? `value: ${item.answer}`
            : '';
      const kind = item.is_value === true ? 'value' : item.kind;
      const step = typeof item.parent_id === 'string' ? `step of ${item.parent_id}` : '';
      return [item.id, kind, item.title, extra, where, when, item.place ?? '', step]
        .filter((part) => part !== '')
        .join(' | ');
    })
    .join('\n')
    .concat(rows.length > maxRows ? `\n…and ${String(rows.length - maxRows)} more` : '');
}

async function addItem(db: SupabaseClient, input: Row): Promise<string> {
  const title = text(input.title);
  if (title === null) {
    return 'error: a title is needed';
  }
  const domainId = text(input.domain_id);
  const entityId = text(input.entity_id);
  const date = text(input.date);
  const time = text(input.time);
  if (input.kind === 'appointment') {
    if (date === null || time === null) {
      return 'error: an appointment needs a date and a time; ask for them';
    }
    const { error } = await db.rpc('create_appointments', {
      p_title: title,
      p_domain_id: domainId,
      p_starts: [localToUtc(`${date}T${time}`)],
      p_place_kind: text(input.place) === null ? null : 'in_person',
      p_place: text(input.place),
      p_meeting_url: null,
      p_with_whom: null,
      p_entity_id: domainId === null ? entityId : null,
    });
    return error === null ? `added; time: ${date} ${time}` : `error: ${error.message}`;
  }
  const parentId = text(input.parent_id);
  const kind = parentId !== null ? 'task' : String(input.kind);
  if (kind === 'value') {
    const value = text(input.value);
    if (value === null) {
      return 'error: a value needs the value itself; ask for it';
    }
    return insertItem(db, {
      title,
      kind: 'note',
      is_value: true,
      answer: value,
      domain_id: domainId,
      entity_id: domainId === null ? entityId : null,
      notes: text(input.notes),
    });
  }
  if (kind === 'goal') {
    const target = text(input.target_date);
    return insertItem(
      db,
      {
        title,
        kind: 'goal',
        domain_id: domainId,
        entity_id: domainId === null ? entityId : null,
        notes: text(input.notes),
        // Urgent unless it has a target date, or the parent said there is no rush.
        ...(target !== null
          ? { time_mode: 'scheduled', due_date: target }
          : input.no_date === true
            ? { time_mode: 'anytime', due_date: null }
            : { time_mode: 'urgent', due_date: null }),
      },
      target !== null
        ? `target date ${target}`
        : input.no_date === true
          ? 'no date (ללא מועד)'
          : 'urgent (דחוף)',
    );
  }
  if (kind === 'issue' || kind === 'tracker' || kind === 'note') {
    return insertItem(db, {
      title,
      kind,
      domain_id: domainId,
      entity_id: domainId === null ? entityId : null,
      notes: text(input.notes),
      ...(kind === 'tracker'
        ? { tracker_unit: text(input.unit), tracker_summary: text(input.summary) ?? 'sum' }
        : {}),
    });
  }
  // A task with no date is urgent, unless the parent said it has no date; a step with no
  // date follows its goal (urgent when the goal is).
  const timeFields =
    date !== null
      ? { time_mode: 'scheduled', due_date: date, due_time: time }
      : input.urgent === true || (input.no_date !== true && parentId === null)
        ? { time_mode: 'urgent', due_date: null }
        : { time_mode: 'anytime', due_date: null };
  const timeSaid =
    timeFields.time_mode === 'scheduled'
      ? `${date ?? ''}${time === null ? '' : ` ${time}`}`
      : timeFields.time_mode === 'urgent'
        ? 'urgent (דחוף)'
        : 'no date (ללא מועד)';
  return insertItem(
    db,
    {
      title,
      kind: 'task',
      domain_id: domainId,
      entity_id: domainId === null ? entityId : null,
      parent_id: parentId,
      notes: text(input.notes),
      ...timeFields,
    },
    timeSaid,
  );
}

/** Adds one item row and says where it stands. */
async function insertItem(db: SupabaseClient, row: Row, timeSaid?: string): Promise<string> {
  const { data, error } = await db
    .from('items')
    .insert(row)
    .select('id, is_complete, time_mode')
    .single();
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const added = data as Row;
  // A step of an urgent goal turns urgent with it, so what was saved is what is told.
  const time =
    timeSaid === undefined
      ? ''
      : `; time: ${added.time_mode === 'urgent' ? 'urgent (דחוף)' : timeSaid}`;
  return added.is_complete === true
    ? `added, id ${String(added.id)}${time}`
    : `added, id ${String(added.id)}${time}; it waits in "להשלמה" to be completed`;
}

/** A debt: its item, and the row of its details; the item goes if the details fail. */
async function addDebt(db: SupabaseClient, input: Row): Promise<string> {
  const counterparty = text(input.counterparty);
  const amount = typeof input.amount === 'number' ? input.amount : Number(input.amount);
  const direction =
    input.direction === 'we_owe'
      ? 'we_owe'
      : input.direction === 'owed_to_us'
        ? 'owed_to_us'
        : null;
  if (counterparty === null || !Number.isFinite(amount) || amount <= 0 || direction === null) {
    return 'error: a debt needs who, a positive amount and which way; ask for what is missing';
  }
  const domainId = text(input.domain_id);
  const { data, error } = await db
    .from('items')
    .insert({
      title: counterparty,
      kind: 'debt',
      domain_id: domainId,
      entity_id: domainId === null ? text(input.entity_id) : null,
    })
    .select('id, is_complete')
    .single();
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const item = data as Row;
  const { error: detailsError } = await db
    .from('debt_details')
    .insert({ item_id: item.id, amount, counterparty, direction });
  if (detailsError !== null) {
    await db.from('items').delete().eq('id', item.id);
    return `error: ${detailsError.message}`;
  }
  return item.is_complete === true
    ? `added, id ${String(item.id)}`
    : `added, id ${String(item.id)}; it waits in "להשלמה" for a domain`;
}

async function addToShopping(db: SupabaseClient, house: Household, input: Row): Promise<string> {
  const titles = Array.isArray(input.titles)
    ? input.titles.map(text).filter((title): title is string => title !== null)
    : [];
  if (titles.length === 0 || house.homeShopping === null) {
    return 'error: nothing to add';
  }
  const { error } = await db.from('items').insert(
    titles.map((title) => ({
      title,
      kind: 'missing_item',
      domain_id: house.homeShopping,
      shopping_category: text(input.category) ?? 'food',
    })),
  );
  return error === null ? `added ${String(titles.length)}` : `error: ${error.message}`;
}

async function addReminder(db: SupabaseClient, house: Household, input: Row): Promise<string> {
  const itemId = text(input.item_id);
  const at = text(input.at);
  if (itemId === null) {
    return 'error: which item?';
  }
  const reminder =
    at !== null
      ? { rule: 'at', at: localToUtc(at) }
      : typeof input.minutes_before === 'number'
        ? { rule: 'before', minutes_before: input.minutes_before }
        : null;
  if (reminder === null) {
    return 'error: give minutes_before or at';
  }
  const { error } = await db
    .from('item_reminders')
    .insert({ item_id: itemId, member_ids: [house.memberId], ...reminder });
  return error === null ? 'added' : `error: ${error.message}`;
}

async function completeItem(db: SupabaseClient, input: Row): Promise<string> {
  const itemId = text(input.item_id);
  if (itemId === null) {
    return 'error: which item?';
  }
  const { data, error } = await db
    .from('items')
    .select('id, title, kind, time_mode, due_date, status')
    .eq('id', itemId)
    .single();
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const item = data as Row;
  if (input.confirmed !== true) {
    return `not done yet: ask the user to confirm marking "${String(item.title)}" done`;
  }
  if (item.status !== 'open') {
    return 'it is already closed';
  }
  if (item.time_mode === 'recurring' && repeatingKinds.has(String(item.kind))) {
    const { error: markError } =
      item.due_date !== null
        ? await db.rpc('mark_occurrence', { p_item_id: itemId, p_status: 'done' })
        : await db.rpc('close_item', { p_item_id: itemId });
    return markError === null
      ? `done: ${String(item.title)} (this time)`
      : `error: ${markError.message}`;
  }
  const { error: doneError } = await db.from('items').update({ status: 'done' }).eq('id', itemId);
  return doneError === null ? `done: ${String(item.title)}` : `error: ${doneError.message}`;
}

/** The local day and hour an item is at now: an appointment's start, or its date and hour. */
function currentTimeOf(item: Row): { day: string | null; hour: string | null } {
  if (item.kind === 'appointment' && typeof item.starts_at === 'string') {
    const [day = '', hour = ''] = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      dateStyle: 'short',
      timeStyle: 'short',
    })
      .format(new Date(item.starts_at))
      .split(' ');
    return { day, hour };
  }
  return {
    day: typeof item.due_date === 'string' ? item.due_date : null,
    hour: typeof item.due_time === 'string' ? item.due_time.slice(0, 5) : null,
  };
}

/**
 * Changes the time of a repeating item: only the current time (as "move this time" in the app),
 * or the hour or weekdays of every time from now (the rest of its settings stay). Returns an
 * error to tell the model, or null when done.
 */
async function changeRepeatingTime(
  db: SupabaseClient,
  item: Row,
  input: Row,
): Promise<string | null> {
  if (input.urgent === true || input.no_date === true) {
    return 'error: a repeating item cannot be made urgent or undated here; its repeat is stopped in the app';
  }
  const scope = text(input.scope);
  if (scope !== 'this_time' && scope !== 'from_now') {
    return 'error: ask the parent "רק הפעם, או מעכשיו בכל פעם?", then call again with scope';
  }
  const date = text(input.date);
  const time = text(input.time);
  if (scope === 'this_time') {
    const now = currentTimeOf(item);
    const day = date ?? now.day;
    if (day === null) {
      return 'error: no time is waiting now to move';
    }
    const { error } = await db.rpc('move_occurrence', {
      p_item_id: item.id,
      p_date: day,
      p_time: time ?? now.hour,
    });
    return error === null ? null : `error: ${error.message}`;
  }
  if (date !== null) {
    return 'error: from now on changes the hour or the weekdays; to move one time use scope this_time';
  }
  const { data, error } = await db.from('item_repeats').select('*').eq('item_id', item.id).single();
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const repeat = data as Row;
  if (repeat.hebrew === true || (Array.isArray(repeat.dates) && repeat.dates.length > 0)) {
    return 'error: this one follows its own dates (such as a Hebrew date); it is changed in the app';
  }
  const times: unknown[] = Array.isArray(repeat.times) ? repeat.times : [];
  const ownTimes = times.length > 0 ? times : repeat.at_time === null ? [] : [repeat.at_time];
  if (time !== null && ownTimes.length > 1) {
    return 'error: it repeats at several hours a day; those are changed in the app';
  }
  const weekdays = Array.isArray(input.weekdays)
    ? input.weekdays.filter(
        (day): day is number =>
          typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6,
      )
    : null;
  if (weekdays !== null && (repeat.unit !== 'week' || weekdays.length === 0)) {
    return 'error: days of the week are for an item that repeats weekly';
  }
  const { error: saveError } = await db.rpc('save_repeat', {
    p_item_id: item.id,
    p_every: repeat.every,
    p_unit: repeat.unit,
    p_starts_on: repeat.starts_on,
    p_times: time === null ? ownTimes : [time],
    p_weekdays: repeat.unit === 'week' ? (weekdays ?? repeat.weekdays ?? []) : [],
    p_from_kind: repeat.from_kind,
    p_end_kind: repeat.end_kind,
    p_end_count: repeat.end_count,
    p_end_until: repeat.end_until,
    p_tracker_closes: repeat.tracker_closes,
  });
  return saveError === null ? null : `error: ${saveError.message}`;
}

async function updateItem(db: SupabaseClient, house: Household, input: Row): Promise<string> {
  const itemId = text(input.item_id);
  if (itemId === null) {
    return 'error: which item?';
  }
  const { data, error } = await db
    .from('items')
    .select('id, title, kind, time_mode, due_date, due_time, starts_at, parent_id')
    .eq('id', itemId)
    .single();
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const item = data as Row;
  const changes: Row = {};
  const title = text(input.title);
  if (title !== null) {
    changes.title = title;
  }
  // Where it is: a domain decides its entity; an entity alone leaves it waiting for a domain.
  const domainId = text(input.domain_id);
  const entityId = text(input.entity_id);
  if (domainId !== null || entityId !== null) {
    if (item.parent_id !== null) {
      return 'error: a step takes its domain from its goal or issue; move that instead';
    }
    if (domainId !== null) {
      if (!house.places.has(domainId)) {
        return 'error: no such domain; take one from the household list';
      }
      if (house.shoppingDomains.has(domainId) !== (item.kind === 'missing_item')) {
        return 'error: a shopping domain holds shopping items only, and a shopping item stays in one';
      }
      Object.assign(changes, { domain_id: domainId, entity_id: null });
    } else if (entityId !== null) {
      if (!house.entityNames.has(entityId)) {
        return 'error: no such entity; take one from the household list';
      }
      Object.assign(changes, { domain_id: null, entity_id: entityId });
    }
  }
  const date = text(input.date);
  const time = text(input.time);
  const changesTime =
    date !== null ||
    time !== null ||
    input.urgent === true ||
    input.no_date === true ||
    Array.isArray(input.weekdays);
  if (changesTime && item.time_mode === 'recurring') {
    // Its other changes first, then the time, which goes by the series' own rules.
    if (Object.keys(changes).length > 0) {
      const { error: otherError } = await db.from('items').update(changes).eq('id', itemId);
      if (otherError !== null) {
        return `error: ${otherError.message}`;
      }
    }
    const timeError = await changeRepeatingTime(db, item, input);
    return timeError ?? `changed: ${String(item.title)}`;
  }
  if (item.kind === 'appointment') {
    if (date !== null || time !== null) {
      const current =
        typeof item.starts_at === 'string'
          ? new Intl.DateTimeFormat('sv-SE', {
              timeZone,
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(item.starts_at))
          : '';
      const [currentDate = '', currentTime = ''] = current.split(' ');
      const day = date ?? currentDate;
      const hour = time ?? currentTime;
      if (day === '' || hour === '') {
        return 'error: an appointment needs a day and an hour';
      }
      changes.starts_at = localToUtc(`${day}T${hour}`);
    }
  } else if (input.urgent === true) {
    Object.assign(changes, { time_mode: 'urgent', due_date: null, due_time: null });
  } else if (input.no_date === true) {
    Object.assign(changes, { time_mode: 'anytime', due_date: null, due_time: null });
  } else if (date !== null) {
    Object.assign(changes, { time_mode: 'scheduled', due_date: date, due_time: time });
  } else if (time !== null) {
    if (item.due_date === null) {
      return 'error: it has no day yet; ask which day';
    }
    changes.due_time = time;
  }
  if (Object.keys(changes).length === 0) {
    return 'error: nothing to change';
  }
  const { error: updateError } = await db.from('items').update(changes).eq('id', itemId);
  return updateError === null ? `changed: ${String(item.title)}` : `error: ${updateError.message}`;
}

async function listDone(db: SupabaseClient, house: Household, input: Row): Promise<string> {
  const days = Math.min(31, Math.max(1, typeof input.days === 'number' ? input.days : 7));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await db
    .from('items')
    .select('title, kind, completed_at, domain_id')
    .eq('status', 'done')
    .neq('kind', 'question')
    .neq('kind', 'shopping_run')
    .gte('completed_at', since)
    .order('completed_at', { ascending: false })
    .limit(maxRows);
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return 'nothing';
  }
  return rows
    .map((item) =>
      [
        String(item.completed_at).slice(0, 10),
        item.kind,
        item.title,
        typeof item.domain_id === 'string' ? (house.places.get(item.domain_id) ?? '') : '',
      ].join(' | '),
    )
    .join('\n');
}

async function addEntry(db: SupabaseClient, input: Row): Promise<string> {
  const itemId = text(input.item_id);
  const value = text(input.value);
  if (itemId === null || value === null) {
    return 'error: which tracker, and what value?';
  }
  const { error } = await db.from('tracker_entries').insert({
    item_id: itemId,
    on_date: text(input.date) ?? localDate(),
    value,
    note: text(input.note),
  });
  return error === null ? 'added' : `error: ${error.message}`;
}

async function addData(db: SupabaseClient, input: Row): Promise<string> {
  const itemId = text(input.item_id);
  const value = text(input.value);
  if (itemId === null || value === null) {
    return 'error: to which item, and what?';
  }
  const { error } = await db
    .from('item_data')
    .insert({ item_id: itemId, label: text(input.label), value });
  return error === null ? 'added' : `error: ${error.message}`;
}

async function addQuestion(db: SupabaseClient, input: Row): Promise<string> {
  const issueId = text(input.issue_id);
  const question = text(input.question);
  if (issueId === null || question === null) {
    return 'error: which issue, and what question?';
  }
  const { error } = await db
    .from('items')
    .insert({ title: question, kind: 'question', parent_id: issueId });
  return error === null ? 'added' : `error: ${error.message}`;
}

/** The id an "added, id …" result names. */
function addedId(result: string): string | null {
  return /^added, id ([0-9a-f-]{36})/.exec(result)?.[1] ?? null;
}

/** What a tool touched: the items to open from the answer, or the shopping list. */
type Touched = { readonly itemIds: readonly string[]; readonly shopping: boolean };
const untouched: Touched = { itemIds: [], shopping: false };

function touchedItem(itemId: string | null): Touched {
  return itemId === null ? untouched : { itemIds: [itemId], shopping: false };
}

async function runTool(
  db: SupabaseClient,
  house: Household,
  name: string,
  input: Row,
): Promise<{ readonly result: string; readonly changed: boolean; readonly touched: Touched }> {
  const target = text(input.item_id);
  switch (name) {
    case 'list_items':
      return { result: await listItems(db, house, input), changed: false, touched: untouched };
    case 'add_item':
    case 'add_debt': {
      const result = name === 'add_item' ? await addItem(db, input) : await addDebt(db, input);
      const ok = result.startsWith('added');
      return { result, changed: ok, touched: ok ? touchedItem(addedId(result)) : untouched };
    }
    case 'add_to_shopping': {
      const result = await addToShopping(db, house, input);
      const ok = result.startsWith('added');
      return { result, changed: ok, touched: ok ? { itemIds: [], shopping: true } : untouched };
    }
    case 'add_reminder':
    case 'add_entry':
    case 'add_data': {
      const result =
        name === 'add_reminder'
          ? await addReminder(db, house, input)
          : name === 'add_entry'
            ? await addEntry(db, input)
            : await addData(db, input);
      const ok = result === 'added';
      return { result, changed: ok, touched: ok ? touchedItem(target) : untouched };
    }
    case 'add_question': {
      const result = await addQuestion(db, input);
      const ok = result === 'added';
      return { result, changed: ok, touched: ok ? touchedItem(text(input.issue_id)) : untouched };
    }
    case 'complete_item': {
      const result = await completeItem(db, input);
      const ok = result.startsWith('done');
      return { result, changed: ok, touched: ok ? touchedItem(target) : untouched };
    }
    case 'update_item': {
      const result = await updateItem(db, house, input);
      const ok = result.startsWith('changed');
      return { result, changed: ok, touched: ok ? touchedItem(target) : untouched };
    }
    case 'list_done':
      return { result: await listDone(db, house, input), changed: false, touched: untouched };
    default:
      return { result: `error: no tool ${name}`, changed: false, touched: untouched };
  }
}

/**
 * Lines at the end of an answer that the app shows as buttons to what was just done:
 * "[[link:/item/<id>|<title>]]". Kept with the answer, and left out of what the model reads.
 */
async function linkLines(
  db: SupabaseClient,
  itemIds: readonly string[],
  shopping: boolean,
): Promise<string> {
  const lines: string[] = [];
  const unique = [...new Set(itemIds)].slice(0, 8);
  if (unique.length > 0) {
    const { data } = await db.from('items').select('id, title').in('id', unique);
    const titles = new Map(
      ((data ?? []) as Row[]).map((row) => [String(row.id), String(row.title)]),
    );
    for (const id of unique) {
      const title = titles.get(id);
      if (title !== undefined) {
        lines.push(`[[link:/item/${id}|${title.replace(/[|\]\]]/g, ' ')}]]`);
      }
    }
  }
  if (shopping) {
    lines.push('[[link:/shopping|רשימת הקניות]]');
  }
  return lines.join('\n');
}

/** An answer as the model should read it again: without the lines of buttons. */
function withoutLinks(answer: string): string {
  return answer.replace(/\n*\[\[link:[^\]]*\]\]/g, '').trim();
}

function systemPrompt(house: Household): string {
  const today = localDate();
  const weekday = new Intl.DateTimeFormat('he-IL', { timeZone, weekday: 'long' }).format(
    new Date(),
  );
  return `You are the assistant of משכן, a home-management app shared by two parents. You are talking with ${house.memberName}.
Today is ${weekday}, ${today} (Israel time).

Talk like a good friend who knows the app well: natural, warm and easy, in Hebrew, never stiff or robotic. Keep answers short unless asked for more; a light touch of humor is fine. You may also simply chat, think things through with the parent, and help them decide; not every message needs a tool.
Plain text only: no markdown at all (no **, no #, no tables); for a list, start each line with •.
Use the tools to look things up and to add things; never guess what is in the app, and never invent ids.
When you add something, say in one line what was added and where (and when). When a request is unclear (which child, which day, what time, which way a debt goes), ask one short question instead of guessing.
You can list and search everything, add every kind of item (task, step, appointment, goal, issue, note, value, tracker, debt, shopping), add reminders, move an item to another day or hour, rename it, and mark it done (a debt: paid). Before marking anything done, ask "לסמן את X כבוצע?" and wait for a yes. You can also record a tracker entry, add a row to a note or an issue, and add a question to an issue. You cannot delete items or change repeating ones: say so, and suggest doing it in the app. The app shows a button to each item you added or changed under your answer, so do not write links or ids yourself.
For a summary of a week or a day, use list_done for what was done and list_items for what is left.
When a photo comes (an invitation, a letter, a schedule, a note from school), read it and add the matching item with all its details: an event at a set time is an appointment (title, date, time, place); put the rest (who invites, the address, what to bring, dress, RSVP) in notes, or in the place for an appointment. Choose the entity and domain that fit (for example "אירועים" of the right entity). If the day or hour is missing or unclear, ask before adding. Then say in one line what you added.

Advising which kind of item to open is a main part of your job. When the parent asks (or seems unsure), recommend the best kind in a sentence or two, say why, and offer to open it. The kinds of משכן:
• משימה (task): one thing to do. Its time: on a date (with an hour if wanted), repeating, urgent ("דחוף", no date but shown with today's), with no date, waiting (for something else), or on the shelf (for later). A reminder can ring at any time.
• תור/פגישה (appointment): a meeting at a set day and hour, with a place and "with whom". Reminders a day and an hour before come by themselves. A class every Tuesday is a repeating appointment.
• יעד (goal): something bigger to achieve, split into steps (each step a task with its own time), with an optional target date by which all steps are done, and a progress bar. "לשפץ את המרפסת", "להכין את הבר מצווה".
• סוגיה (issue): something to work out or decide: it gathers information, open questions with their answers, data rows and steps. "בחירת בית ספר", "בעיה עם הביטוח". It has no time of its own; its steps do.
• פתק (note): information to keep, text with optional rows (a line of text, or a name and a value). A recipe, a list of sizes, instructions.
• נתון (value): one name and one value, shown right in the lists with a copy button: "קוד השער: 4512", "מספר תעודת זהות", "מספר פוליסה". Several separate facts, each looked up on its own, are best as several values; facts that belong together (all the car's details) are best as one note with rows.
• מעקב (tracker): something recorded again and again over time, each entry a date, a value and a note, with a summary: the running total ("סכום מצטבר", expenses of a renovation) or the latest value ("ערך אחרון", weight, height). It can repeat (weigh every week), and can sit inside an issue.
• חוב (debt): who owes whom and how much, with the totals at the top of the debts tab; closed when paid.
• פריט חסר (shopping): something to buy, on the shared list; the usual is the supermarket ("סופר"), sorted by its departments.
Choosing the kind when the parent asks to add something: take it from their words when it is clear ("תזכיר לי", "צריך ל..." is a task; a meeting or a class at a set hour is an appointment; "הקוד של", "מספר ה..." with one value is a value; "חייב לנו" is a debt; "לקנות" is shopping; something to work out with questions is an issue; a project in stages is a goal; something weighed or spent again and again is a tracker). When two kinds could fit and the difference matters (a value or a note, a task or a goal, a task or an appointment), do not guess: ask one short question that offers the two, in a sentence, and say what each would give them. Every time you add something, name the kind you chose in your answer ("פתחתי נתון...", "רשמתי חוב..."), so a wrong choice is seen at once; it can be converted in the app. For anything with a time, say its time too, as the tool result gives it: "דחוף", "ללא מועד", or the day and hour ("משימה 'להתקשר לחשמלאי', דחוף"). A task or a goal with no date is added as urgent unless the parent says there is no rush; then give no_date. A step with no date follows its goal.
Every item belongs to an entity (the home, the couple, each parent, each child, "אישי" that only its owner sees, family and friends) and a domain in it (health, education, events...). Something not yet fully placed waits in "להשלמה".
Dates the user says ("מחר", "ביום שלישי", "בעוד שבוע") are relative to today.

The household's entities and all their domains (name [domain id]), read fresh for this message, so it is complete and up to date, including what the parents set up lately. Never say an entity or a domain does not exist when it is here; match what the parent says to it loosely (a different spelling, with or without ה, a short form). Entity kinds: home (the household), couple (the two parents), parent (one of the parents), child, personal (the parent's own, that only they see), circle (family and friends, apart from the home). A debt goes in a domain marked (debts) when there is one; a domain marked (shopping list) holds only things to buy.
${house.summary}`;
}

type GeminiAnswer = {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  error?: { message?: string; status?: string; details?: Row[] };
};

/** Statuses of a model that is busy for a moment, worth asking again. */
const busyStatuses = [500, 503, 504];
/** Waits before asking a busy model again, in milliseconds. */
const busyWaits = [1500, 4000];
/** A quota that frees within this many seconds is waited for; a longer one is not. */
const shortQuotaWait = 10;

/** The model's quota is used up for now; `seconds` until it frees, when it says. */
class QuotaUsedUp extends Error {
  constructor(readonly seconds: number | null) {
    super('quota used up');
  }
}

/** How long a 429 says to wait, in seconds (its RetryInfo, such as "82428.2s"). */
function retryDelayOf(answer: GeminiAnswer): number | null {
  for (const detail of answer.error?.details ?? []) {
    const delay = detail.retryDelay;
    if (typeof delay === 'string') {
      const seconds = Number.parseFloat(delay);
      if (Number.isFinite(seconds)) {
        return seconds;
      }
    }
  }
  return null;
}

/**
 * One round with the model. A busy model is asked again a couple of times; a used-up quota
 * is not (asking again would only use more of it), unless it frees within seconds.
 */
async function askModel(
  modelName: string,
  house: Household,
  contents: GeminiContent[],
): Promise<GeminiAnswer> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt(house) }] },
          contents,
          tools: [{ functionDeclarations: tools }],
        }),
      },
    );
    const answer = (await response.json().catch(() => ({}))) as GeminiAnswer;
    if (response.ok) {
      return answer;
    }
    const retryable = attempt < busyWaits.length;
    if (response.status === 429) {
      const seconds = retryDelayOf(answer);
      if (seconds === null || seconds > shortQuotaWait || !retryable) {
        throw new QuotaUsedUp(seconds);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.ceil(seconds * 1000)));
      continue;
    }
    const wait = busyWaits[attempt];
    if (!busyStatuses.includes(response.status) || wait === undefined) {
      throw new Error(answer.error?.message ?? `model error ${String(response.status)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

/** The answer when the quota is used up: when to write again, in the household's time. */
function quotaReply(seconds: number | null): string {
  if (seconds === null) {
    return 'הגעתי למכסת השיחות שלי לעכשיו. אפשר לנסות שוב מאוחר יותר.';
  }
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `הגעתי למכסת השיחות לרגע. אפשר לנסות שוב בעוד ${minutes === 1 ? 'דקה' : `${String(minutes)} דקות`}.`;
  }
  const at = new Date(Date.now() + seconds * 1000);
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
  const day = localDate(at) === localDate() ? 'היום' : 'מחר';
  return `הגעתי למכסת השיחות היומית. אפשר לחזור לכתוב ${day} בסביבות ${hour}.`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: auth } = await db.auth.getUser(authorization.replace('Bearer ', ''));
    if (auth.user === null) {
      return json({ error: 'not signed in' }, 401);
    }
    const body = (await request.json()) as { message?: unknown; image?: unknown };
    // A photo to read (an invitation, a note), sent as base64 JPEG; a few megabytes at most.
    const image =
      typeof body.image === 'string' && body.image.length > 0 && body.image.length < 6_000_000
        ? body.image
        : null;
    const message =
      text(body.message) ?? (image === null ? null : 'הוסף פריט מתאים מהתמונה, עם כל הפרטים.');
    if (message === null) {
      return json({ error: 'empty message' }, 400);
    }

    const house = await loadHousehold(db, auth.user.id);
    const allowed = (Deno.env.get('ASSISTANT_HOUSEHOLDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');
    if (!allowed.includes(house.householdId)) {
      return json({ error: 'not enabled for this household' }, 403);
    }
    const { count } = await db
      .from('assistant_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', localToUtc(`${localDate()}T00:00`));
    if ((count ?? 0) >= dailyLimit) {
      return json({ reply: 'הגעת למכסת ההודעות להיום. אפשר להמשיך מחר.', changed: false });
    }
    const { data: past } = await db
      .from('assistant_messages')
      .select('role, text')
      .order('created_at', { ascending: false })
      .limit(historyTurns);
    // Earlier turns as plain text only, so nothing replayed depends on what came before it.
    const contents: GeminiContent[] = ((past ?? []) as Row[]).reverse().map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: withoutLinks(String(turn.text)) }],
    }));
    // The conversation must open with the parent.
    while (contents.length > 0 && contents[0]?.role !== 'user') {
      contents.shift();
    }
    contents.push({
      role: 'user',
      parts:
        image === null
          ? [{ text: message }]
          : [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: message }],
    });

    const fallback = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? defaultFallbackModel;
    const models = [
      Deno.env.get('GEMINI_MODEL') ?? defaultModel,
      ...(fallback === 'none' ? [] : [fallback]),
    ];
    let modelIndex = 0;
    // Where this turn starts, to start it over on the other model.
    const turnStart = contents.length;
    let firstQuota: QuotaUsedUp | null = null;
    let changed = false;
    const touchedIds: string[] = [];
    let touchedShopping = false;
    let reply = '';
    for (let round = 0; round < maxRounds; round += 1) {
      let answer: GeminiAnswer;
      try {
        answer = await askModel(models[modelIndex] ?? defaultModel, house, contents);
      } catch (caught) {
        // What was already added stays added: the answer says so, rather than an error that
        // would have the parent send it again and add it twice.
        if (!changed) {
          // Quota used up: the turn starts over on the next model, since nothing was added
          // yet (what was read is read again; the other model's turns are not mixed in).
          if (caught instanceof QuotaUsedUp && modelIndex + 1 < models.length) {
            firstQuota ??= caught;
            modelIndex += 1;
            contents.length = turnStart;
            touchedIds.length = 0;
            touchedShopping = false;
            round = -1;
            continue;
          }
          if (caught instanceof QuotaUsedUp || firstQuota !== null) {
            if (!(caught instanceof QuotaUsedUp)) {
              // The other model failed for another reason, such as a name it does not know.
              console.error(caught);
            }
            // Not kept in the conversation, so the model never reads it as its own answer.
            const quota = caught instanceof QuotaUsedUp ? caught : firstQuota;
            return json({ reply: quotaReply(quota?.seconds ?? null), changed: false });
          }
          throw caught;
        }
        console.error(caught);
        reply = 'עשיתי חלק מזה, אבל לא הצלחתי לסיים. כדאי לבדוק באפליקציה מה נוסף.';
        break;
      }
      const content = answer.candidates?.[0]?.content;
      if (content === undefined) {
        reply = 'אני לא יכול לעזור בזה.';
        break;
      }
      const parts = content.parts ?? [];
      reply = parts
        .map((part) => (typeof part.text === 'string' && part.thought !== true ? part.text : ''))
        .join('')
        .trim();
      const calls = parts.filter((part) => part.functionCall !== undefined);
      if (calls.length === 0) {
        break;
      }
      // The model's turn goes back exactly as it came, with its thought signatures.
      contents.push({ role: 'model', parts });
      const results: GeminiPart[] = [];
      for (const part of calls) {
        const call = part.functionCall ?? { name: '' };
        const outcome = await runTool(db, house, call.name, call.args ?? {});
        changed = changed || outcome.changed;
        touchedIds.push(...outcome.touched.itemIds);
        touchedShopping = touchedShopping || outcome.touched.shopping;
        results.push({
          functionResponse: {
            ...(call.id === undefined ? {} : { id: call.id }),
            name: call.name,
            response: { result: outcome.result },
          },
        });
      }
      contents.push({ role: 'user', parts: results });
    }
    if (reply === '') {
      reply = 'לא הצלחתי להשלים את זה. אפשר לנסח שוב?';
    }
    // Buttons to what was just done, to check it or add to it in the app.
    const links = await linkLines(db, touchedIds, touchedShopping);
    if (links !== '') {
      reply = `${reply}\n\n${links}`;
    }

    await db.from('assistant_messages').insert([
      { role: 'user', text: image === null ? message : `📷 ${message}` },
      { role: 'assistant', text: reply },
    ]);
    return json({ reply, changed });
  } catch (caught) {
    console.error(caught);
    return json({ error: caught instanceof Error ? caught.message : String(caught) }, 500);
  }
});
