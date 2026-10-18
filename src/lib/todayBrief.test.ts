import { describe, expect, it } from 'vitest';
import { timelineOf } from './itemRules';
import { waitingOnYou, weekAhead } from './todayBrief';
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
    expect(week.map((day) => day.date)).toEqual(['2026-10-15', '2026-10-17']);
    expect(week[0]?.things.map((thing) => thing.title)).toEqual([
      'בבוקר',
      'אחר הצהריים',
      'בלי שעה',
    ]);
    expect(week[0]?.things[0]?.time).toBe('08:00');
  });
});
