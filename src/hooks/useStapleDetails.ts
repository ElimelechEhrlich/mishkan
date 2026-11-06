import { useEffect, useState } from 'react';
import { titleKey } from '../lib/departments';
import { toMessage } from '../lib/errors';
import { listStapleDetails } from '../services/stapleService';

export type UseStapleDetails = {
  /** The details used before with this name, the most used first. */
  readonly used: readonly string[];
  readonly error: string | null;
};

/** The details the family used before with a name of the fixed list, to choose from again. */
export function useStapleDetails(title: string): UseStapleDetails {
  const [used, setUsed] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const key = titleKey(title);

  useEffect(() => {
    let current = true;
    listStapleDetails()
      .then((byName) => {
        if (current) {
          setUsed((byName.get(key) ?? []).map((row) => row.details));
        }
      })
      .catch((caught: unknown) => {
        if (current) {
          setError(toMessage(caught));
        }
      });
    return (): void => {
      current = false;
    };
  }, [key]);

  return { used, error };
}
