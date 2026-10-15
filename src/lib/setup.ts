/** The first things to do in the app, in order. */
export const setupSteps = ['tour', 'children', 'invite', 'notifications', 'install'] as const;

export type SetupStep = (typeof setupSteps)[number];

/** What is known of the home and of this device, for the first steps. */
export type SetupFacts = {
  readonly tourDone: boolean;
  readonly hasChildren: boolean;
  readonly bothParents: boolean;
  readonly notificationsOn: boolean;
  /** This browser can take notifications at all. */
  readonly notificationsPossible: boolean;
  readonly installed: boolean;
  /** Installing is offered only on Android. */
  readonly installPossible: boolean;
};

export type SetupState = { readonly step: SetupStep; readonly done: boolean };

/** Whether a step is done; a step that can not be done here is left out (null). */
function stateOf(step: SetupStep, facts: SetupFacts): boolean | null {
  switch (step) {
    case 'tour':
      return facts.tourDone;
    case 'children':
      return facts.hasChildren;
    case 'invite':
      return facts.bothParents;
    case 'notifications':
      return facts.notificationsPossible ? facts.notificationsOn : null;
    case 'install':
      return facts.installPossible || facts.installed ? facts.installed : null;
  }
}

/**
 * The first steps as they stand: each one done or not, leaving out those set aside on purpose
 * ("not relevant") and those this device can not do. Empty once there is nothing left to do.
 */
export function setupState(
  facts: SetupFacts,
  setAside: ReadonlySet<SetupStep>,
): readonly SetupState[] {
  const shown = setupSteps.flatMap((step): SetupState[] => {
    const done = stateOf(step, facts);
    return done === null || setAside.has(step) ? [] : [{ step, done }];
  });
  return shown.every((entry) => entry.done) ? [] : shown;
}
