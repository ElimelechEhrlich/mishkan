import { describe, expect, it } from 'vitest';
import { setupState } from './setup';
import type { SetupFacts } from './setup';

const fresh: SetupFacts = {
  tourDone: false,
  hasChildren: false,
  bothParents: false,
  notificationsOn: false,
  notificationsPossible: true,
  installed: false,
  installPossible: true,
};

describe('the first steps', () => {
  it('lists every step for a new home', () => {
    expect(setupState(fresh, new Set()).map((entry) => entry.step)).toEqual([
      'tour',
      'children',
      'invite',
      'notifications',
      'install',
    ]);
  });

  it('marks what is done, and leaves out what was set aside or can not be done here', () => {
    const state = setupState(
      { ...fresh, hasChildren: true, notificationsPossible: false, installPossible: false },
      new Set(['invite']),
    );
    expect(state).toEqual([
      { step: 'tour', done: false },
      { step: 'children', done: true },
    ]);
  });

  it('is empty once everything is done or set aside', () => {
    const done = { ...fresh, tourDone: true, hasChildren: true, bothParents: true };
    expect(setupState({ ...done, notificationsOn: true, installed: true }, new Set())).toEqual([]);
    expect(setupState(done, new Set(['notifications', 'install']))).toEqual([]);
  });
});
