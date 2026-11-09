/**
 * A request asked by several hooks at the same moment is sent once: while it is on its way,
 * whoever asks again gets the same answer instead of sending it anew.
 */
export function shareable<T>(request: () => Promise<T>): () => Promise<T> {
  let waiting: Promise<T> | null = null;
  return (): Promise<T> => {
    if (waiting === null) {
      waiting = request().finally(() => {
        waiting = null;
      });
    }
    return waiting;
  };
}
