import { labels } from '../constants/labels';

/** Messages browsers give when a request never reached the server. */
const networkMessages = ['Failed to fetch', 'NetworkError', 'Load failed', 'Network request failed'];

/** An error as people should read it; a lost connection in plain words. */
export function toMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (networkMessages.some((text) => message.includes(text))) {
    return labels.status.offline;
  }
  return message;
}
