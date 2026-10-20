import { describe, expect, it } from 'vitest';
import { agendaOf, timelineOf } from './itemRules';
import {
  dayPartOf,
  thisWeek,
  firstFocus,
  focusGroups,
  looseGroups,
  otherGroups,
  stillRelevant,
  nextUp,
  waitingOnYou,
  weekAhead,
} from './todayBrief';
import type { Item } from '../types/domain';

const today = '2026-10-14';

function item(overrides: Partial<Item>): Item {
  return {
    id: 'i',
    household_id: 'h',
    title: 'x',
    notes: null,
    kind: 'task',
    domain_id: 'd',
    parent_id: null,
    time_mode: 'scheduled',
    due_date: today,
    due_time: null,
    remind_at: null,
    recurrence_rule: null,
    status: 'open',
    created_by: 'm',
    completed_by: null,
    review_by: null,
    previous_domain_label: null,
    shopping_category: null,
    run_id: null,
    hidden: false,
    answer: null,
    created_at: '',
    completed_at: null,
    is_complete: true,
    closed_with_parent: false,
    reviewed_at: null,
    shopping_trip: null,
    trip_run_done_at: null,
    auto_key: null,
    reminder_sent_at: null,
    remind_member_ids: null,
    starts_at: null,
    place_kind: null,
    place: null,
    meeting_url: null,
    with_whom: null,
    series_id: null,
    in_main: false,
    is_value: false,
    entity_id: null,
    tracker_unit: null,
    tracker_summary: 'sum',
    urgent_from_parent: false,
    ...overrides,
  };
}

describe('waitingOnYou', () => {
  const none = new Map();

  it('lists open questions with no answer, and goals whose steps are all done', () => {
    const issue = item({ id: 'iss', kind: 'issue', due_date: null });
    const asked = item({ id: 'q1', kind: 'question', parent_id: 'iss', due_date: null });
    const answered = item({
      id: 'q2',
      kind: 'question',
      parent_id: 'iss',
      due_date: null,
      answer: 'כן',
    });
    const reached = item({ id: 'g1', kind: 'goal', due_date: null });
    const going = item({ id: 'g2', kind: 'goal', due_date: null });
    const empty = item({ id: 'g3', kind: 'goal', due_date: null });
    const steps = [
      item({ id: 's1', parent_id: 'g1', status: 'done' }),
      item({ id: 's2', parent_id: 'g2', status: 'done' }),
      item({ id: 's3', parent_id: 'g2' }),
    ];
    const waiting = waitingOnYou(
      [issue, asked, answered, reached, going, empty],
      steps,
      none,
      none,
    );
    expect(waiting.questions.map((question) => question.id)).toEqual(['q1']);
    expect(waiting.reachedGoals.map((goal) => goal.id)).toEqual(['g1']);
  });
});

describe('weekAhead', () => {
  it('gives the days after today that hold something, each by hour', () => {
    const assigned = [
      item({ id: 'a', title: 'אחר הצהריים', due_date: '2026-10-15', due_time: '16:30:00' }),
      item({ id: 'b', title: 'בבוקר', due_date: '2026-10-15', due_time: '08:00:00' }),
      item({ id: 'c', title: 'בלי שעה', due_date: '2026-10-15' }),
      item({ id: 'd', title: 'בעוד שלושה ימים', due_date: '2026-10-17' }),
      item({ id: 'e', title: 'היום', due_date: today }),
      item({ id: 'f', title: 'בעוד שבוע וחצי', due_date: '2026-10-25' }),
    ];
    const week = weekAhead(timelineOf(assigned, [], today), today);
    expect(week.map((day) => day.date)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ]);
    expect(week[1]?.things).toEqual([]);
    expect(week[0]?.things.map((thing) => thing.title)).toEqual([
      'בבוקר',
      'אחר הצהריים',
      'בלי שעה',
    ]);
    expect(week[0]?.things[0]?.time).toBe('08:00');
  });
});

describe('the top of today', () => {
  it('greets by the part of the day', () => {
    expect([6, 13, 18, 23, 3].map(dayPartOf)).toEqual([
      'morning',
      'noon',
      'evening',
      'night',
      'night',
    ]);
  });

  it('finds the next thing with an hour, and what began a few minutes ago', () => {
    const agenda = agendaOf(
      [
        item({ id: 'past', title: 'מוקדם', due_time: '08:00:00' }),
        item({ id: 'now', title: 'עכשיו', due_time: '10:25:00' }),
        item({ id: 'later', title: 'אחר כך', due_time: '16:30:00' }),
        item({ id: 'none', title: 'בלי שעה' }),
      ],
      [],
      today,
    );
    const at = (hour: number, minute: number): Date => new Date(2026, 9, 14, hour, minute);
    expect(nextUp(agenda, at(10, 30))).toMatchObject({ id: 'now', minutes: -5 });
    expect(nextUp(agenda, at(11, 0))).toMatchObject({ id: 'later', time: '16:30', minutes: 330 });
    expect(nextUp(agenda, at(17, 0))).toBeNull();
  });
});

describe('the groups of the first page', () => {
  it('lists steps under their goal, and opens on the first group that holds anything', () => {
    const goal = item({
      id: 'g',
      kind: 'goal',
      title: 'שיפוץ',
      time_mode: 'anytime',
      due_date: null,
    });
    const steps = [
      item({ id: 's', title: 'צבע', parent_id: 'g', time_mode: 'urgent', due_date: null }),
    ];
    const late = item({ id: 'l', title: 'מאחר', due_date: '2026-10-10' });
    const groups = focusGroups(agendaOf([goal, late], steps, today));
    expect(groups.urgent.map((row) => [row.item.id, row.parentTitle])).toEqual([['s', 'שיפוץ']]);
    expect(groups.overdue.map((row) => row.item.id)).toEqual(['l']);
    expect(groups.today).toEqual([]);
    expect(firstFocus(groups)).toBe('urgent');
  });
});

describe('this week', () => {
  it('runs from Sunday to Saturday around today', () => {
    // 2026-10-14 is a Wednesday.
    expect(thisWeek(today)).toEqual([
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
    ]);
  });
});

describe('loose groups and still relevant', () => {
  const old = (title: string, overrides: Partial<Item>): Item =>
    item({ id: title, title, due_date: null, ...overrides });

  it('lists the longest untouched first, and asks about each in turn, a day at a time', () => {
    const items = [
      old('fresh', { time_mode: 'anytime', created_at: '2026-10-18T10:00:00Z' }),
      old('august', { time_mode: 'anytime', created_at: '2026-08-01T10:00:00Z' }),
      old('looked at', {
        time_mode: 'someday',
        created_at: '2026-07-01T10:00:00Z',
        reviewed_at: '2026-10-19T10:00:00Z',
      }),
      old('shelf', { time_mode: 'someday', created_at: '2026-09-10T10:00:00Z' }),
      old('issue', { kind: 'issue', time_mode: null, created_at: '2026-06-01T10:00:00Z' }),
    ];
    const groups = looseGroups(timelineOf(items, [], '2026-10-20'));
    expect(groups.undated.map((row) => row.item.title)).toEqual(['august', 'fresh']);
    expect(groups.someday.map((row) => row.item.title)).toEqual(['shelf', 'looked at']);
    // Each day another of them, and all of them in turn, the oldest kept first in line.
    const days = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'];
    const asked = days.map((day) => stillRelevant(groups, day, new Set())?.row.item.title);
    expect(new Set(asked)).toEqual(new Set(['august', 'shelf', 'fresh', 'looked at']));
    const august = items[1]?.id ?? '';
    const withoutAugust = days.map(
      (day) => stillRelevant(groups, day, new Set([august]))?.row.item.title,
    );
    expect(withoutAugust).not.toContain('august');
    expect(
      stillRelevant(looseGroups(timelineOf([], [], '2026-10-20')), '2026-10-20', new Set()),
    ).toBe(null);
  });
});

describe('other groups', () => {
  it('lists each kind with no time of its own, newest first, leaving out what repeats', () => {
    const at = (day: string): string => `2026-10-${day}T10:00:00Z`;
    const groups = otherGroups(
      [
        item({ id: 'n1', kind: 'note', created_at: at('01') }),
        item({ id: 'n2', kind: 'note', created_at: at('05') }),
        item({ id: 'i', kind: 'issue' }),
        item({ id: 'd', kind: 'debt' }),
        item({ id: 'm', kind: 'missing_item', time_mode: null }),
        item({ id: 'mr', kind: 'missing_item', time_mode: 'recurring', due_date: '2026-10-30' }),
        item({ id: 'r', kind: 'missing_item', run_id: 'run' }),
        item({ id: 't', kind: 'tracker', time_mode: null }),
        item({ id: 'tr', kind: 'tracker', time_mode: 'recurring' }),
        item({ id: 'task', kind: 'task' }),
      ],
      '2026-10-20',
    );
    expect(groups.notes.map((entry) => entry.id)).toEqual(['n2', 'n1']);
    expect(groups.issues.map((entry) => entry.id)).toEqual(['i']);
    expect(groups.debts.map((entry) => entry.id)).toEqual(['d']);
    expect(groups.shopping.map((entry) => entry.id)).toEqual(['m']);
    expect(groups.trackers.map((entry) => entry.id)).toEqual(['t']);
  });
});
