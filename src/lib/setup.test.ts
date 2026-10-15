import { describe, expect, it } from 'vitest';
import { openSteps, setupState } from './setup';
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
  it('lists every step for a new home, all open', () => {
    const steps = setupState(fresh, new Set());
    expect(steps.map((entry) => entry.step)).toEqual([
      'tour',
      'children',
      'invite',
      'notifications',
      'install',
    ]);
    expect(openSteps(steps)).toHaveLength(5);
  });

  it('marks what is done or put aside, and leaves out what can not be done here', () => {
    const state = setupState(
      { ...fresh, hasChildren: true, notificationsPossible: false, installPossible: false },
      new Set(['invite']),
    );
    expect(state).toEqual([
      { step: 'tour', done: false, setAside: false },
      { step: 'children', done: true, setAside: false },
      { step: 'invite', done: false, setAside: true },
    ]);
    expect(openSteps(state).map((entry) => entry.step)).toEqual(['tour']);
  });

  it('keeps the steps once everything is done or put aside, with nothing open', () => {
    const done = { ...fresh, tourDone: true, hasChildren: true, bothParents: true };
    const steps = setupState(done, new Set(['notifications', 'install']));
    expect(steps).toHaveLength(5);
    expect(openSteps(steps)).toEqual([]);
  });
});
