/** The first things to do in the app, in order. */
export const setupSteps = ['children', 'invite', 'notifications', 'install'] as const;

export type SetupStep = (typeof setupSteps)[number];

/** What is known of the home and of this device, for the first steps. */
export type SetupFacts = {
  readonly hasChildren: boolean;
  readonly bothParents: boolean;
  readonly notificationsOn: boolean;
  /** This browser can take notifications at all. */
  readonly notificationsPossible: boolean;
  readonly installed: boolean;
  /** Installing is offered only on Android. */
  readonly installPossible: boolean;
};

export type SetupState = {
  readonly step: SetupStep;
  readonly done: boolean;
  /** Put aside on purpose ("not relevant"); it can be brought back. */
  readonly setAside: boolean;
};

/** Whether a step is done; a step that can not be done here is left out (null). */
function stateOf(step: SetupStep, facts: SetupFacts): boolean | null {
  switch (step) {
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
 * The first steps as they stand: each one done or not, or put aside on purpose ("not
 * relevant"), leaving out those this device can not do.
 */
export function setupState(
  facts: SetupFacts,
  setAside: ReadonlySet<SetupStep>,
): readonly SetupState[] {
  return setupSteps.flatMap((step): SetupState[] => {
    const done = stateOf(step, facts);
    return done === null ? [] : [{ step, done, setAside: !done && setAside.has(step) }];
  });
}

/** The steps still to do: neither done nor put aside. */
export function openSteps(steps: readonly SetupState[]): readonly SetupState[] {
  return steps.filter((entry) => !entry.done && !entry.setAside);
}
