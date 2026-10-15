import { labels } from '../constants/labels';

/** Messages browsers give when a request never reached the server. */
const networkMessages = [
  'Failed to fetch',
  'NetworkError',
  'Load failed',
  'Network request failed',
];

/** Refusals of the database, in the words of the app. */
const serverMessages = [
  ['step after the goal date', labels.errors.stepAfterGoal],
  ['step repeats past the goal date', labels.errors.repeatsAfterGoal],
  ['an appointment needs a day and an hour', labels.errors.appointmentHour],
] as const;

/** The message of a request given up on, below in plain words. */
const timedOut = 'request timed out';

/**
 * A change that got no answer from the server in time is given up on, so the screen is not
 * left waiting for ever (a network that lets pages load but holds back what is sent).
 */
export function withTimeout<T>(work: Promise<T>, milliseconds = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timedOut));
    }, milliseconds);
    work.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** An error as people should read it; a lost connection in plain words. */
export function toMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === timedOut) {
    return labels.errors.timeout;
  }
  if (networkMessages.some((text) => message.includes(text))) {
    return labels.status.offline;
  }
  const late = /steps after the goal date: (.*)/.exec(message);
  if (late !== null) {
    return labels.errors.stepsAfterGoal(late[1] ?? '');
  }
  const known = serverMessages.find(([text]) => message.includes(text));
  if (known !== undefined) {
    return known[1];
  }
  return message;
}
