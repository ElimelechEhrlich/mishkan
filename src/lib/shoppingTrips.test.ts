import { describe, expect, it } from 'vitest';
import { tripWhen } from './shoppingTrips';

describe('tripWhen', () => {
  it('says when going out shopping is, short', () => {
    const today = '2026-10-20';
    expect(tripWhen({ time_mode: 'scheduled', due_date: '2026-10-20' }, today)).toBe('היום');
    expect(tripWhen({ time_mode: 'scheduled', due_date: '2026-10-18' }, today)).toBe('היום');
    expect(tripWhen({ time_mode: 'scheduled', due_date: '2026-10-21' }, today)).toBe('מחר');
    expect(tripWhen({ time_mode: 'urgent', due_date: null }, today)).toBe('דחוף');
    expect(tripWhen({ time_mode: 'anytime', due_date: null }, today)).toBe('ללא מועד');
  });
});
