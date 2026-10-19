const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const H = 'h1',
  ME = 'm1',
  SP = 'm2';
let seq = 0;
const id = (p) => `${p}-${String(++seq).padStart(4, '0')}-0000-0000-000000000000`;
const now = new Date().toISOString();
const households = [
  {
    id: H,
    name: 'בית אהרון',
    invite_code: '11111111-1111-1111-1111-111111111111',
    auto_remind_member_ids: null,
    created_at: now,
  },
];
const members = [
  {
    id: ME,
    household_id: H,
    name: 'אלימלך',
    color: null,
    role: 'parent',
    user_id: 'u1',
    created_at: now,
  },
  {
    id: SP,
    household_id: H,
    name: 'רחל',
    color: null,
    role: 'parent',
    user_id: 'u2',
    created_at: now,
  },
];
const defaults = {
  personal: [
    ['התפתחות אישית', 'regular'],
    ['הפתעות', 'regular'],
  ],
  home: [
    ['טכני ותיקונים', 'regular'],
    ['כספים וחובות', 'debts'],
    ['מסמכים', 'regular'],
    ['רכב', 'regular'],
    ['אירועים', 'regular'],
  ],
  couple: [
    ['התפתחות זוגית', 'regular'],
    ['זמן משותף', 'regular'],
  ],
  parent: [
    ['בריאות', 'regular'],
    ['אירועים', 'regular'],
  ],
  child: [
    ['חינוך', 'regular'],
    ['בריאות', 'regular'],
    ['התפתחות', 'regular'],
  ],
  circle: [
    ['משפחה', 'regular'],
    ['חברים', 'regular'],
  ],
};
const entities = [],
  domains = [];
const addEntity = (kind, name, sort, member_id = null) => {
  const e = {
    id: id('e'),
    household_id: H,
    kind,
    name,
    member_id,
    sort_order: sort,
    position: null,
    id_number: null,
    birth_date: null,
    born_after_sunset: false,
    notes: null,
    wedding_date: null,
    wedding_after_sunset: false,
    avatar_emoji: null,
    avatar_path: null,
    created_at: now,
  };
  entities.push(e);
  [...defaults[kind], ...(kind === 'circle' ? [] : [['קניות', 'shopping']])].forEach(
    ([n, role], i) =>
      domains.push({
        id: id('d'),
        household_id: H,
        entity_id: e.id,
        name: n,
        icon: null,
        sort_order: role === 'shopping' ? 100 : i + 1,
        role,
        created_at: now,
      }),
  );
  return e;
};
addEntity('personal', 'אישי', 0, ME);
addEntity('home', 'הבית', 1);
addEntity('couple', 'זוגי', 2);
addEntity('parent', 'אלימלך', 3, ME);
addEntity('parent', 'רחל', 3, SP);
for (const n of ['שרולי', 'יונטי', 'זאבי', 'אלי', 'שימי']) addEntity('child', n, 4);
addEntity('circle', 'משפחה וחברים', 100);
const dom = (entity, name) =>
  domains.find((d) => d.name === name && d.entity_id === entities.find((e) => e.name === entity).id)
    .id;
const items = [];
const item = (o) => {
  const it = {
    id: id('i'),
    household_id: H,
    title: '',
    notes: null,
    kind: 'task',
    domain_id: null,
    parent_id: null,
    time_mode: null,
    due_date: null,
    due_time: null,
    remind_at: null,
    recurrence_rule: null,
    status: 'open',
    created_by: ME,
    completed_by: null,
    review_by: ME,
    previous_domain_label: null,
    shopping_category: null,
    run_id: null,
    hidden: false,
    answer: null,
    remind_at: null,
    remind_member_ids: null,
    reminder_sent_at: null,
    auto_key: null,
    starts_at: null,
    place_kind: null,
    place: null,
    meeting_url: null,
    with_whom: null,
    series_id: null,
    in_main: false,
    closed_with_parent: false,
    created_at: now,
    completed_at: null,
    ...o,
  };
  it.is_complete =
    it.domain_id !== null && (!['task', 'goal'].includes(it.kind) || it.time_mode !== null);
  items.push(it);
  return it;
};
item({
  title: 'לחדש ביטוח רכב',
  domain_id: dom('הבית', 'רכב'),
  time_mode: 'scheduled',
  due_date: day(-1),
});
item({
  title: 'טופס הרשמה לחוג',
  domain_id: dom('אלי', 'חינוך'),
  time_mode: 'scheduled',
  due_date: day(-2),
});
const g = item({
  title: 'שולחן וכיסאות לסלון',
  kind: 'goal',
  domain_id: dom('הבית', 'טכני ותיקונים'),
  time_mode: 'anytime',
});
item({
  title: 'למדוד את החדר',
  parent_id: g.id,
  domain_id: g.domain_id,
  time_mode: 'scheduled',
  due_date: day(0),
});
item({
  title: 'לפנות את הפינה',
  parent_id: g.id,
  domain_id: g.domain_id,
  time_mode: 'scheduled',
  due_date: day(0),
});
item({
  title: 'לבדוק זמני משלוח',
  parent_id: g.id,
  domain_id: g.domain_id,
  time_mode: 'urgent',
});
item({
  title: 'להשוות מחירים בשלוש חנויות',
  parent_id: g.id,
  domain_id: g.domain_id,
  time_mode: 'anytime',
});
item({
  title: 'לבחור צבע',
  parent_id: g.id,
  domain_id: g.domain_id,
  time_mode: 'anytime',
  status: 'done',
});
item({
  title: 'ערב זוגי — להזמין מקום',
  domain_id: dom('זוגי', 'זמן משותף'),
  time_mode: 'scheduled',
  due_date: day(0),
});
item({
  title: 'להוציא את הפח',
  domain_id: dom('הבית', 'טכני ותיקונים'),
  time_mode: 'recurring',
  due_date: day(0),
  recurrence_rule: 'FREQ=WEEKLY',
});
item({
  title: 'אסיפת הורים',
  domain_id: dom('אלי', 'חינוך'),
  time_mode: 'scheduled',
  due_date: day(4),
});
const at = (d, hm) => {
  const [h, m] = hm.split(':');
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(Number(h), Number(m), 0, 0);
  return x.toISOString();
};
item({
  title: 'בדיקה תקופתית',
  kind: 'appointment',
  domain_id: dom('רחל', 'בריאות'),
  time_mode: 'scheduled',
  due_date: day(0),
  starts_at: at(0, '16:30'),
  place_kind: 'in_person',
  place: 'קופת חולים, הרצל 12',
  with_whom: 'רופא/ת ילדים',
});
item({
  title: 'שיחת מעקב',
  kind: 'appointment',
  domain_id: dom('אלי', 'חינוך'),
  time_mode: 'scheduled',
  due_date: day(1),
  starts_at: at(1, '10:00'),
  place_kind: 'phone',
  place: '050-1234567',
  with_whom: 'היועצת',
});
for (const w of [0, 1, 2])
  item({
    title: 'ריפוי בעיסוק',
    kind: 'appointment',
    domain_id: dom('זאבי', 'בריאות'),
    time_mode: 'scheduled',
    due_date: day(3 + 7 * w),
    starts_at: at(3 + 7 * w, '08:15'),
    place_kind: 'video',
    meeting_url: 'https://zoom.us/j/123',
    with_whom: 'ריפוי בעיסוק',
    series_id: 'ser',
  });
item({
  title: 'מתנה ליום הולדת',
  domain_id: dom('אישי', 'הפתעות'),
  time_mode: 'scheduled',
  due_date: day(9),
});
item({ title: 'לקבוע שיעור פרטי במתמטיקה', domain_id: dom('זאבי', 'חינוך'), time_mode: 'anytime' });
item({ title: 'מוגנות לילדים', kind: 'issue', domain_id: dom('זוגי', 'התפתחות זוגית') });
item({ title: 'קוד השער: 4512', kind: 'note', domain_id: dom('הבית', 'מסמכים') });
item({
  title: 'נעלי ספורט',
  kind: 'missing_item',
  domain_id: dom('אלי', 'קניות'),
  shopping_category: 'clothing',
});
item({
  title: 'חלב',
  kind: 'missing_item',
  domain_id: dom('הבית', 'קניות'),
  shopping_category: 'food',
});
// A supermarket run, to show it by department.
const RUN = '00000000-0000-4000-8000-0000000000aa';
item({ id: RUN, title: 'סבב קניות · סופר', kind: 'shopping_run', domain_id: dom('הבית', 'קניות') });
[
  ['עגבניות', 'done'],
  ['נייר טואלט', 'open'],
  ['לחם', 'open'],
  ['קוטג׳', 'open'],
  ['מלפפונים', 'done'],
  ['שמפו', 'open'],
  ['במבה', 'open'],
  ['גבינה צהובה', 'open'],
  ['מתנה לגננת', 'open'],
  ['חזה עוף', 'open'],
].forEach(([title, status], n) =>
  item({
    title,
    status,
    kind: 'missing_item',
    domain_id: dom('הבית', 'קניות'),
    shopping_category: 'food',
    run_id: RUN,
    created_at: new Date(Date.parse(now) + n * 60000).toISOString(),
    completed_at: status === 'done' ? now : null,
  }),
);
const departmentNames = [
  ['produce', 'ירקות ופירות'],
  ['bakery', 'לחם ומאפים'],
  ['dairy', 'חלב וביצים'],
  ['meat', 'בשר, עוף ודגים'],
  ['frozen', 'קפואים'],
  ['dry', 'יבשים ושימורים'],
  ['drinks', 'משקאות'],
  ['snacks', 'חטיפים ומתוקים'],
  ['cleaning', 'ניקיון'],
  ['hygiene', 'טיפוח והיגיינה'],
  ['baby', 'תינוקות'],
];
const shopping_departments = departmentNames.map(([key, name], n) => ({
  id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`,
  household_id: H,
  name,
  key,
  position: n + 1,
  created_at: now,
}));
const shopping_item_departments = [];
const shopping_staples = [
  ['חלב', 14], ['לחם', 12], ['ביצים', 9], ['עגבניות', 8], ['מלפפונים', 8], ['קוטג׳', 7],
  ['נייר טואלט', 5], ['במבה', 5], ['שמפו', 2], ['חזה עוף', 4], ['אורז', 3], ['מתנה לגננת', 1],
].map(([title, times], n) => ({
  id: `00000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`,
  household_id: H,
  title,
  title_key: title,
  times,
  last_added_at: now,
}));
item({ title: 'לסדר את המחסן', domain_id: null });
const shid = item({
  title: 'שידוך לאחיינית',
  kind: 'goal',
  domain_id: dom('משפחה וחברים', 'משפחה'),
  time_mode: 'anytime',
});
item({
  title: 'לדבר עם השדכנית',
  parent_id: shid.id,
  domain_id: shid.domain_id,
  time_mode: 'scheduled',
  due_date: day(0),
});
item({
  title: 'להתקשר לסבתא לפני שבת',
  domain_id: dom('משפחה וחברים', 'משפחה'),
  time_mode: 'scheduled',
  due_date: day(0),
  in_main: true,
});
item({
  title: 'להחזיר ספר לחבר',
  domain_id: dom('משפחה וחברים', 'חברים'),
  time_mode: 'scheduled',
  due_date: day(-1),
});
item({ title: 'צביעת חדר ילדים', domain_id: dom('הבית', 'טכני ותיקונים'), time_mode: 'someday' });
item({ title: 'לקנות סוללות', domain_id: dom('אלי', 'קניות'), time_mode: 'anytime' });
// done-week
for (const [t, by] of [
  ['לשלם חשמל', ME],
  ['לתקן ברז', ME],
  ['לקנות מתנה', SP],
])
  item({
    title: t,
    domain_id: dom('הבית', 'טכני ותיקונים'),
    status: 'done',
    completed_by: by,
    completed_at: now,
    time_mode: 'anytime',
  });
if (process.env.MANY) {
  const ds = domains.filter((d) => d.role === 'regular');
  for (let n = 0; n < Number(process.env.MANY); n += 1)
    item({
      title: 'משימה ' + n,
      domain_id: ds[n % ds.length].id,
      time_mode: n % 3 ? 'scheduled' : 'anytime',
      due_date: n % 3 ? day((n % 60) - 20) : null,
    });
}
const eli = entities.find((e) => e.name === 'אלי');
Object.assign(eli, {
  birth_date: '2016-10-28',
  id_number: '328456712',
  notes: 'אוהב לבנות דברים. צריך עידוד בקריאה.',
});
Object.assign(
  entities.find((e) => e.kind === 'couple'),
  { wedding_date: '2010-06-15', avatar_emoji: '💑' },
);
Object.assign(
  entities.find((e) => e.name === 'זאבי'),
  { avatar_emoji: '⚽' },
);
for (const [n, b] of [
  ['שרולי', '2014-03-02'],
  ['יונטי', '2019-07-11'],
  ['זאבי', '2012-01-20'],
  ['שימי', '2021-05-05'],
])
  entities.find((e) => e.name === n).birth_date = b;
const entity_lists = [],
  entity_list_values = [];
for (const e of entities.filter((x) => x.kind === 'child'))
  ['תחביבים', 'חוזקות'].forEach((t, i) =>
    entity_lists.push({
      id: id('l'),
      household_id: H,
      entity_id: e.id,
      title: t,
      sort_order: i + 1,
      created_at: now,
    }),
  );
const lst = (t) => entity_lists.find((l) => l.entity_id === eli.id && l.title === t).id;
for (const v of ['כדורגל', 'לגו', 'ציור'])
  entity_list_values.push({ id: id('v'), list_id: lst('תחביבים'), value: v, created_at: now });
for (const v of ['יצירתי', 'חברותי'])
  entity_list_values.push({ id: id('v'), list_id: lst('חוזקות'), value: v, created_at: now });
const gate = items.find((x) => x.id === 'i-0069-0000-0000-000000000000');
gate.title = 'קוד השער';
gate.is_value = true;
gate.answer = '4512';
const recipe = item({
  id: 'i-cake-0000-0000-0000-000000000000',
  title: 'עוגת שוקולד',
  kind: 'note',
  domain_id: gate.domain_id,
});
const item_data = [
  { id: 'd1', item_id: recipe.id, label: 'קמח', value: '2 כוסות', position: 1, created_at: now },
  { id: 'd2', item_id: recipe.id, label: 'סוכר', value: 'כוס', position: 2, created_at: now },
  {
    id: 'd3',
    item_id: recipe.id,
    label: null,
    value: 'לחמם תנור ל־180',
    position: 3,
    created_at: now,
  },
  {
    id: 'd4',
    item_id: recipe.id,
    label: null,
    value: 'לאפות 35 דקות',
    position: 4,
    created_at: now,
  },
];
const trk = item({
  id: 'i-trk1-0000-0000-0000-000000000000',
  title: 'הוצאות שיפוץ',
  kind: 'tracker',
  domain_id: gate.domain_id,
  tracker_unit: '₪',
  tracker_summary: 'sum',
});
const issue = items.find((x) => x.kind === 'issue');
const w = item({
  id: 'i-trk2-0000-0000-0000-000000000000',
  title: 'משקל',
  kind: 'tracker',
  parent_id: issue.id,
  domain_id: issue.domain_id,
  tracker_unit: 'ק״ג',
  tracker_summary: 'latest',
});
const tracker_entries = [
  { id: 't1', item_id: trk.id, on_date: day(-10), value: '1,200', note: 'צבע', created_at: now },
  { id: 't2', item_id: trk.id, on_date: day(-3), value: '850', note: null, created_at: now },
  { id: 't3', item_id: trk.id, on_date: day(0), value: '400', note: 'ידיות', created_at: now },
  { id: 't4', item_id: w.id, on_date: day(-7), value: '78.5', note: null, created_at: now },
  { id: 't5', item_id: w.id, on_date: day(0), value: '77.2', note: null, created_at: now },
];
item({
  id: 'i-inc1-0000-0000-0000-000000000000',
  title: 'מספר תעודת זהות',
  kind: 'note',
  is_value: true,
  answer: '123',
  domain_id: null,
  entity_id: entities.find((e) => e.name === 'שרולי').id,
});
item({
  id: 'i-inc2-0000-0000-0000-000000000000',
  title: 'הוצאות חוג',
  kind: 'tracker',
  domain_id: null,
  entity_id: null,
});
item({
  id: 'i-urg1-0000-0000-0000-000000000000',
  title: 'להתקשר לאינסטלטור',
  domain_id: dom('הבית', 'טכני ותיקונים'),
  time_mode: 'urgent',
});
const shelfG = item({
  id: 'i-shg1-0000-0000-0000-000000000000',
  title: 'לשפץ את המרפסת',
  kind: 'goal',
  domain_id: dom('הבית', 'טכני ותיקונים'),
  time_mode: 'someday',
});
item({
  title: 'לקבל הצעת מחיר מקבלן',
  parent_id: shelfG.id,
  domain_id: shelfG.domain_id,
  time_mode: 'scheduled',
  due_date: day(1),
});
item({
  title: 'לבחור ריצוף',
  parent_id: shelfG.id,
  domain_id: shelfG.domain_id,
  time_mode: 'anytime',
});
const lateG = item({
  id: 'i-ltg1-0000-0000-0000-000000000000',
  title: 'לסדר את הגינה',
  kind: 'goal',
  domain_id: dom('הבית', 'טכני ותיקונים'),
  time_mode: 'scheduled',
  due_date: day(-2),
});
item({
  title: 'לקנות שתילים',
  parent_id: lateG.id,
  domain_id: lateG.domain_id,
  time_mode: 'scheduled',
  due_date: day(3),
});
item({
  id: 'i-pst1-0000-0000-0000-000000000000',
  title: 'רופא שיניים',
  kind: 'appointment',
  domain_id: dom('רחל', 'בריאות'),
  time_mode: 'scheduled',
  due_date: day(-2),
  starts_at: at(-2, '10:00'),
  place_kind: 'in_person',
  place: 'מרפאה',
});
const hr = item({
  id: 'i-hour-0000-0000-0000-000000000000',
  title: 'לאסוף את אלי מהחוג',
  domain_id: dom('אלי', 'חינוך'),
  time_mode: 'scheduled',
  due_date: day(0),
  due_time: '17:30:00',
});
item({
  title: 'להעביר תשלום לגן',
  domain_id: dom('הבית', 'כספים וחובות'),
  time_mode: 'scheduled',
  due_date: day(0),
  due_time: '08:00:00',
});
const wt = item({
  id: 'i-wait-0000-0000-0000-000000000000',
  title: 'לחדש מרשם',
  domain_id: dom('רחל', 'בריאות'),
  time_mode: 'anytime',
});
const R = (o) => ({
  id: id('r'),
  item_id: hr.id,
  rule: 'before',
  at: null,
  minutes_before: null,
  days_before: null,
  at_time: null,
  every: null,
  unit: null,
  until: null,
  member_ids: null,
  due_at: now,
  sent_for: null,
  sent_at: null,
  legacy: false,
  created_at: now,
  ...o,
});
item({
  id: 'i-notm-0000-0000-0000-000000000000',
  title: 'לתקן מדף',
  domain_id: dom('הבית', 'טכני ותיקונים'),
  time_mode: null,
});
const item_reminders = [
  R({ minutes_before: 60 }),
  R({ rule: 'day', days_before: 1, at_time: '20:00:00', member_ids: [SP] }),
  R({ item_id: wt.id, rule: 'day', days_before: 0, at_time: '09:00:00', due_at: null }),
  R({ item_id: items.find((x) => x.title === 'בדיקה תקופתית').id, minutes_before: 1440 }),
  R({ item_id: items.find((x) => x.title === 'בדיקה תקופתית').id, minutes_before: 60 }),
  R({
    item_id: items.find((x) => x.title === 'קוד השער').id,
    rule: 'repeat',
    at: at(1, '09:00'),
    every: 3,
    unit: 'month',
  }),
];
const trash = items.find((x) => x.title === 'להוציא את הפח');
const filt = item({
  id: 'i-rep3-0000-0000-0000-000000000000',
  title: 'להחליף פילטר במזגן',
  domain_id: trash.domain_id,
  time_mode: 'recurring',
  due_date: day(0),
  due_time: '20:00:00',
  recurrence_rule: 'FREQ=MONTHLY;INTERVAL=3',
});
const anti = item({
  id: 'i-anti-0000-0000-0000-000000000000',
  title: 'אנטיביוטיקה ליוסי',
  domain_id: dom('אלי', 'בריאות'),
  time_mode: 'recurring',
  due_date: null,
  due_time: null,
  recurrence_rule: 'FREQ=DAILY',
});
const Rp = (o) => ({
  every: 1,
  unit: 'week',
  starts_on: day(0),
  at_time: null,
  end_kind: 'never',
  end_count: null,
  end_until: null,
  stopped_on: null,
  missed_from: day(-30),
  updated_at: now,
  times: [],
  weekdays: [],
  from_kind: 'schedule',
  planned_date: null,
  planned_time: null,
  tracker_closes: false,
  dates: [],
  hebrew: false,
  ...o,
});
const pill = item({
  id: 'i-pill-0000-0000-0000-000000000000',
  title: 'ויטמין D',
  domain_id: dom('רחל', 'בריאות'),
  time_mode: 'recurring',
  due_date: day(0),
  due_time: '08:00:00',
  recurrence_rule: 'FREQ=DAILY',
});
const gym = item({
  id: 'i-gym1-0000-0000-0000-000000000000',
  title: 'חוג שחייה',
  kind: 'appointment',
  domain_id: dom('אלי', 'חינוך'),
  time_mode: 'recurring',
  due_date: day(1),
  starts_at: at(1, '16:00'),
  recurrence_rule: 'FREQ=WEEKLY',
});
const item_repeats = [
  Rp({
    item_id: pill.id,
    unit: 'day',
    times: ['08:00:00', '14:00:00', '20:00:00'],
    at_time: '08:00:00',
  }),
  Rp({
    item_id: gym.id,
    times: ['16:00:00'],
    at_time: '16:00:00',
    weekdays: [2, 4],
    starts_on: day(1),
  }),
  Rp({ item_id: trash.id }),
  Rp({
    item_id: filt.id,
    every: 3,
    unit: 'month',
    starts_on: day(-180),
    at_time: '20:00:00',
    end_kind: 'count',
    end_count: 7,
  }),
  Rp({ item_id: anti.id, unit: 'day', starts_on: day(-7), end_kind: 'count', end_count: 7 }),
];
const Oc = (o) => ({ id: id('o'), at_time: null, done_by: ME, done_at: now, ...o });
const occurrences = [
  Oc({ item_id: filt.id, on_date: day(-90), status: 'done' }),
  Oc({ item_id: filt.id, on_date: day(-180), status: 'skipped', done_by: SP }),
];
for (let n = 1; n <= 7; n += 1)
  occurrences.push(
    Oc({
      item_id: anti.id,
      on_date: day(-8 + n),
      status: n === 3 ? 'missed' : 'done',
      done_by: n === 3 ? null : SP,
    }),
  );
const occurrence_counts = Object.values(
  occurrences.reduce((counts, o) => {
    const c = (counts[o.item_id] ??= { item_id: o.item_id, done: 0, gone: 0 });
    if (o.status === 'done') c.done += 1;
    if (o.status !== 'closed_with_parent') c.gone += 1;
    return counts;
  }, {}),
);
// Debts: one important with a monthly plan and payments, two that can wait, one owed to us.
const debtRows = [];
const debtPayments = [];
const debt = (title, amount, direction, extra = {}, itemExtra = {}) => {
  const it = item({ title, kind: 'debt', domain_id: dom('הבית', 'כספים וחובות'), time_mode: null, due_date: null, ...itemExtra });
  debtRows.push({ item_id: it.id, amount, counterparty: title, direction, important: false, monthly_amount: null, monthly_day: null, plan_starts: null, repay_total: null, ...extra });
  return it;
};
const bank = debt('הלוואה מהבנק', 12000, 'we_owe', { important: true, monthly_amount: 1000, monthly_day: 10, plan_starts: day(-70), repay_total: 13000 }, { time_mode: 'scheduled', due_date: day(0) });
debt('דני – ארוחה', 150, 'we_owe');
const moshe = debt('משה – מקדחה', 400, 'we_owe');
debt('יוסי השכן', 250, 'owed_to_us', { important: true });
const monthOf = (d) => `${d.slice(0, 8)}01`;
debtPayments.push(
  { id: 'p1', item_id: bank.id, household_id: H, amount: 1000, paid_on: day(-70), for_month: monthOf(day(-70)), skipped: false, note: null, created_by: null, created_at: now },
  { id: 'p2', item_id: bank.id, household_id: H, amount: 0, paid_on: day(-40), for_month: monthOf(day(-40)), skipped: true, note: null, created_by: null, created_at: now },
  { id: 'p4', item_id: bank.id, household_id: H, amount: 400, paid_on: day(-2), for_month: monthOf(day(0)), skipped: false, note: null, created_by: null, created_at: now },
  { id: 'p3', item_id: moshe.id, household_id: H, amount: 100, paid_on: day(-5), for_month: null, skipped: false, note: 'מזומן', created_by: null, created_at: now },
);
const debt_paid = Object.values(debtPayments.reduce((sum, p) => {
  const row = (sum[p.item_id] ??= { item_id: p.item_id, paid: 0 });
  row.paid += p.amount;
  return sum;
}, {}));

module.exports = {
  tables: {
    item_repeats,
    occurrences,
    occurrence_counts,
    item_reminders,
    tracker_entries,
    item_data,
    shopping_departments,
    shopping_item_departments,
    shopping_staples,
    assistant_messages: [],
    calendar_items: items
      .filter((i) => ['בדיקה תקופתית', 'שיחת מעקב'].includes(i.title))
      .map((i) => ({ item_id: i.id })),
    households,
    members,
    entities,
    domains,
    items,
    entity_lists,
    entity_list_values,
    debt_details: debtRows,
    debt_payments: debtPayments,
    debt_paid,
    prerequisites: [],
    attachments: [],
    completions: [],
  },
};
