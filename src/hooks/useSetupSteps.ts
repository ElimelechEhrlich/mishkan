import { useCallback, useSyncExternalStore } from 'react';
import { isAndroid, isInstalledApp } from '../lib/install';
import { notificationPermission, pushSupported } from '../lib/push';
import { openSteps, setupState, setupSteps } from '../lib/setup';
import type { SetupFacts, SetupState, SetupStep } from '../lib/setup';
import type { EntityWithDomains } from '../types/domain';
import { cachedEntities } from './useEntities';
import { usePushNotifications } from './usePushNotifications';
import type { UsePushNotifications } from './usePushNotifications';
import { useHouseholdContext } from './useRouteContext';

const tourDoneKey = 'mishkan.tourDone';
const setAsideKey = 'mishkan.setupSetAside';
const pushNotNowKey = 'mishkan.pushNotNow';

let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Kept on this device; when storage is blocked it lasts until the app is closed. */
function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice is not kept, and the step shows again next time.
  }
  version += 1;
  listeners.forEach((listener) => {
    listener();
  });
}

function isStep(value: unknown): value is SetupStep {
  return setupSteps.some((step) => step === value);
}

function setAside(): ReadonlySet<SetupStep> {
  try {
    const parsed: unknown = JSON.parse(read(setAsideKey) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter(isStep) : []);
  } catch {
    return new Set();
  }
}

/** The full tour was gone through to its end on this device. */
export function markTourDone(): void {
  write(tourDoneKey, 'yes');
}

function facts(
  entities: readonly EntityWithDomains[],
  parents: number,
  notificationsOn: boolean,
): SetupFacts {
  return {
    tourDone: read(tourDoneKey) === 'yes',
    hasChildren: entities.some((entity) => entity.kind === 'child'),
    bothParents: parents >= 2,
    notificationsOn,
    notificationsPossible: pushSupported(),
    installed: isInstalledApp(),
    installPossible: isAndroid(),
  };
}

export type UseSetupSteps = {
  readonly steps: readonly SetupState[];
  readonly push: UsePushNotifications;
  /** "Not relevant": the step waits, folded away, on this device. */
  readonly setAside: (step: SetupStep) => void;
  /** Brings a step put aside back among those to do. */
  readonly bringBack: (step: SetupStep) => void;
};

/**
 * The first steps in the app, for the card at the head of the settings and the tour's end
 * (which shows outside the pages, so it is given what it needs rather than reading it).
 */
export function useSetupSteps(
  entities: readonly EntityWithDomains[],
  parents: number,
): UseSetupSteps {
  const push = usePushNotifications();
  useSyncExternalStore(subscribe, () => version);
  const steps = setupState(facts(entities, parents, push.status === 'on'), setAside());
  const putAside = useCallback((step: SetupStep): void => {
    write(setAsideKey, JSON.stringify([...setAside(), step]));
  }, []);
  const bringBack = useCallback((step: SetupStep): void => {
    write(setAsideKey, JSON.stringify([...setAside()].filter((other) => other !== step)));
  }, []);
  return { steps, push, setAside: putAside, bringBack };
}

/** Whether a first step is still open, for a dot on the settings button; loads nothing. */
export function useSetupPending(): boolean {
  const { member, members } = useHouseholdContext();
  useSyncExternalStore(subscribe, () => version);
  const on = pushSupported() && notificationPermission() === 'granted';
  return (
    openSteps(setupState(facts(cachedEntities(member.id), members.length, on), setAside())).length >
    0
  );
}

export type UsePushPrompt = {
  /** Notifications can be turned on here, are off, and were not put off. */
  readonly show: boolean;
  readonly busy: boolean;
  readonly enable: () => void;
  readonly notNow: () => void;
};

/** The one-tap offer, on the main page, to turn notifications on for this device. */
export function usePushPrompt(): UsePushPrompt {
  const push = usePushNotifications();
  useSyncExternalStore(subscribe, () => version);
  const putOff = read(pushNotNowKey) === 'yes' || setAside().has('notifications');
  return {
    show: push.status === 'off' && !putOff,
    busy: push.busy,
    enable: push.enable,
    notNow: (): void => {
      write(pushNotNowKey, 'yes');
    },
  };
}
