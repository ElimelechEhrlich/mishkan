// Supabase Edge Function: the assistant. A parent writes a message in the app; Claude reads it
// with the conversation so far, uses the tools below to look at and add to the household's
// items, and answers in Hebrew. Every read and write goes through the parent's own sign-in,
// so the database's rules apply as in the app: the parent sees and changes only what they may.
// It needs one secret, ANTHROPIC_API_KEY, and should have ASSISTANT_HOUSEHOLDS: the household ids
// (comma-separated) it serves, since its cost is the owner's; without it, it serves no one.
// SUPABASE_URL and SUPABASE_ANON_KEY are provided.
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0';
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.50.0';

/** The low-cost model, as the owner chose. */
const model = 'claude-haiku-5-5';
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

const tools: Anthropic.Tool[] = [
  {
    name: 'list_items',
    description:
      'Lists open items of the household. Use it to answer what there is to do, what is late, what is on the shopping list, what waits to be completed, or to find an item before acting on it.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
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
          type: 'string',
          enum: ['task', 'appointment', 'goal', 'issue', 'note', 'tracker', 'missing_item', 'debt'],
        },
        entity_id: { type: 'string', description: 'Only the items of this entity.' },
        search: { type: 'string', description: 'Words that must appear in the title.' },
      },
      required: ['section'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_item',
    description:
      'Adds a task, an appointment or a note. Give a domain_id when the right domain is clear from the household list; when it is not, ask, or leave it out and the item waits in "להשלמה" to be completed.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        kind: { type: 'string', enum: ['task', 'appointment', 'note'] },
        domain_id: { type: 'string' },
        entity_id: {
          type: 'string',
          description: 'The entity, when known but its domain is not.',
        },
        date: { type: 'string', description: 'YYYY-MM-DD. For a task: its day. Required for an appointment.' },
        time: { type: 'string', description: 'HH:MM, 24-hour. Required for an appointment.' },
        urgent: { type: 'boolean', description: 'A task to do as soon as possible, with no date.' },
        place: { type: 'string', description: 'Where an appointment is.' },
        notes: { type: 'string' },
      },
      required: ['title', 'kind'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_to_shopping',
    description:
      'Adds things to buy to the household\'s shared shopping list, one title per thing.',
    input_schema: {
      type: 'object',
      properties: {
        titles: { type: 'array', items: { type: 'string' } },
        category: {
          type: 'string',
          enum: ['food', 'clothing', 'urgent', 'planned'],
          description: 'food is the supermarket ("סופר"), the usual one.',
        },
      },
      required: ['titles'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_reminder',
    description:
      'Adds a reminder to an item (find its id with list_items first). Either minutes before the item\'s own time, or at a given local date and time.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        minutes_before: { type: 'integer', minimum: 0 },
        at: { type: 'string', description: 'YYYY-MM-DDTHH:MM, local time.' },
      },
      required: ['item_id'],
      additionalProperties: false,
    },
  },
];

type Household = {
  readonly householdId: string;
  readonly memberId: string;
  readonly memberName: string;
  /** Domain id to "entity · domain", for showing where an item is. */
  readonly places: Map<string, string>;
  readonly entityNames: Map<string, string>;
  /** The home's shopping domain. */
  readonly homeShopping: string | null;
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
  const lines: string[] = [];
  for (const entity of (entities ?? []) as Row[]) {
    entityNames.set(String(entity.id), String(entity.name));
    const own = ((domains ?? []) as Row[]).filter((domain) => domain.entity_id === entity.id);
    for (const domain of own) {
      places.set(String(domain.id), `${String(entity.name)} · ${String(domain.name)}`);
      if (entity.kind === 'home' && domain.role === 'shopping') {
        homeShopping = String(domain.id);
      }
    }
    lines.push(
      `- ${String(entity.name)} (${String(entity.kind)}, id ${String(entity.id)}): ` +
        own
          .filter((domain) => domain.role === 'regular')
          .map((domain) => `${String(domain.name)} [${String(domain.id)}]`)
          .join(', '),
    );
  }
  return {
    householdId: String((member as Row | null)?.household_id ?? ''),
    memberId: String((member as Row | null)?.id ?? ''),
    memberName: String((member as Row | null)?.name ?? ''),
    places,
    entityNames,
    homeShopping,
    summary: lines.join('\n'),
  };
}

async function listItems(db: SupabaseClient, house: Household, input: Row): Promise<string> {
  const today = localDate();
  const weekEnd = addDays(today, 7);
  const { data, error } = await db
    .from('items')
    .select(
      'id, title, kind, time_mode, due_date, due_time, starts_at, is_complete, domain_id, entity_id, run_id, parent_id, shopping_category, place',
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
        return item.is_complete === true && due !== null && due < today && item.kind !== 'appointment';
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
          : [item.due_date, item.due_time, item.time_mode].filter((part) => part !== null).join(' ');
      return [item.id, item.kind, item.title, where, when, item.place ?? '']
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
    return error === null ? 'added' : `error: ${error.message}`;
  }
  const timeFields =
    input.kind === 'note'
      ? {}
      : input.urgent === true
        ? { time_mode: 'urgent', due_date: null }
        : date !== null
          ? { time_mode: 'scheduled', due_date: date, due_time: time }
          : { time_mode: 'anytime', due_date: null };
  const { data, error } = await db
    .from('items')
    .insert({
      title,
      kind: input.kind,
      domain_id: domainId,
      entity_id: domainId === null ? entityId : null,
      notes: text(input.notes),
      ...timeFields,
    })
    .select('id, is_complete')
    .single();
  if (error !== null) {
    return `error: ${error.message}`;
  }
  const row = data as Row;
  return row.is_complete === true
    ? `added, id ${String(row.id)}`
    : `added, id ${String(row.id)}; it waits in "להשלמה" for a domain`;
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

async function runTool(
  db: SupabaseClient,
  house: Household,
  name: string,
  input: Row,
): Promise<{ readonly result: string; readonly changed: boolean }> {
  switch (name) {
    case 'list_items':
      return { result: await listItems(db, house, input), changed: false };
    case 'add_item': {
      const result = await addItem(db, input);
      return { result, changed: result.startsWith('added') };
    }
    case 'add_to_shopping': {
      const result = await addToShopping(db, house, input);
      return { result, changed: result.startsWith('added') };
    }
    case 'add_reminder': {
      const result = await addReminder(db, house, input);
      return { result, changed: result === 'added' };
    }
    default:
      return { result: `error: no tool ${name}`, changed: false };
  }
}

function systemPrompt(house: Household): string {
  const today = localDate();
  const weekday = new Intl.DateTimeFormat('he-IL', { timeZone, weekday: 'long' }).format(new Date());
  return `You are the assistant of משכן, a home-management app shared by two parents. You are talking with ${house.memberName}.
Today is ${weekday}, ${today} (Israel time).

Answer in Hebrew, short and warm, the way a helpful person would in a chat. No markdown headings or tables; short lists are fine.
Use the tools to look things up and to add things; never guess what is in the app, and never invent ids.
When you add something, say in one line what was added and where (and when). When a request is unclear (which child, which day, what time), ask one short question instead of guessing.
You can list, search, add tasks, appointments, notes, shopping items and reminders. You cannot yet mark things done, delete, or change items: say so, and suggest doing it in the app.
Dates the user says ("מחר", "ביום שלישי", "בעוד שבוע") are relative to today.

The household's entities and their regular domains (name [domain id]):
${house.summary}`;
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
    const body = (await request.json()) as { message?: unknown };
    const message = text(body.message);
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
    const history = ((past ?? []) as Row[])
      .reverse()
      .map((turn): Anthropic.MessageParam => ({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: String(turn.text),
      }));
    // The conversation must open with the parent.
    while (history.length > 0 && history[0]?.role !== 'user') {
      history.shift();
    }
    const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: message }];

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });
    let changed = false;
    let reply = '';
    for (let round = 0; round < maxRounds; round += 1) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        output_config: { effort: 'low' },
        system: systemPrompt(house),
        tools,
        messages,
      });
      if (response.stop_reason === 'refusal') {
        reply = 'אני לא יכול לעזור בזה.';
        break;
      }
      const uses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );
      reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
      if (response.stop_reason !== 'tool_use' || uses.length === 0) {
        break;
      }
      messages.push({ role: 'assistant', content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of uses) {
        const outcome = await runTool(db, house, use.name, (use.input ?? {}) as Row);
        changed = changed || outcome.changed;
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: outcome.result,
          is_error: outcome.result.startsWith('error'),
        });
      }
      messages.push({ role: 'user', content: results });
    }
    if (reply === '') {
      reply = 'לא הצלחתי להשלים את זה. אפשר לנסח שוב?';
    }

    await db.from('assistant_messages').insert([
      { role: 'user', text: message },
      { role: 'assistant', text: reply },
    ]);
    return json({ reply, changed });
  } catch (caught) {
    console.error(caught);
    return json({ error: caught instanceof Error ? caught.message : String(caught) }, 500);
  }
});
