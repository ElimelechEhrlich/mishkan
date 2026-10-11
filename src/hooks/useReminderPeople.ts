import { useEffect, useMemo, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listMembersWithPush } from '../services/pushService';
import type { Member } from '../types/domain';

/** A parent a reminder can go to, and whether any of their devices gets notifications. */
export type ReminderPerson = {
  readonly id: string;
  readonly name: string;
  readonly hasPush: boolean;
};

export type UseReminderPeople = {
  readonly people: readonly ReminderPerson[];
  readonly error: string | null;
};

/** The parents who have joined, for choosing whom a reminder is for. */
export function useReminderPeople(members: readonly Member[]): UseReminderPeople {
  const [withPush, setWithPush] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listMembersWithPush()
      .then((ids) => {
        if (active) {
          setWithPush(new Set(ids));
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(toMessage(caught));
        }
      });
    return (): void => {
      active = false;
    };
  }, []);

  const people = useMemo(
    () =>
      members
        .filter((member) => member.role === 'parent' && member.user_id !== null)
        .map((member) => ({ id: member.id, name: member.name, hasPush: withPush.has(member.id) })),
    [members, withPush],
  );

  return { people, error };
}
