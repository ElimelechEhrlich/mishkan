import { useCallback, useState } from 'react';
import { toMessage } from '../lib/errors';
import { shrinkToAvatar } from '../lib/image';
import { setEntityEmoji, setEntityPhoto } from '../services/entityService';
import type { EntityWithDomains } from '../types/domain';

export type UseEntityAvatar = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly choosePhoto: (file: File) => Promise<boolean>;
  /** An emoji, or null for the first letter again. */
  readonly chooseEmoji: (emoji: string | null) => Promise<boolean>;
};

/** Changing an entity's picture; reloads the entities through `onChanged` when done. */
export function useEntityAvatar(
  entity: EntityWithDomains,
  onChanged: () => Promise<void>,
): UseEntityAvatar {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (change: () => Promise<void>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await change();
        await onChanged();
        return true;
      } catch (caught: unknown) {
        setError(toMessage(caught));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  const choosePhoto = useCallback(
    (file: File): Promise<boolean> =>
      run(async () => {
        await setEntityPhoto(entity, await shrinkToAvatar(file));
      }),
    [run, entity],
  );

  const chooseEmoji = useCallback(
    (emoji: string | null): Promise<boolean> => run(() => setEntityEmoji(entity, emoji)),
    [run, entity],
  );

  return { busy, error, choosePhoto, chooseEmoji };
}
