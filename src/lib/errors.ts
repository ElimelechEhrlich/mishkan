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

/** An error as people should read it; a lost connection in plain words. */
export function toMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
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
