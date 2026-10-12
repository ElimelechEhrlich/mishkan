import { useMemo } from 'react';
import { toListEntries } from '../lib/itemRules';
import type { ListEntry } from '../lib/itemRules';
import type { Item } from '../types/domain';

/** Appointments as list rows, grouped by their day and sorted by their start time. */
export function useAppointments(appointments: readonly Item[]): readonly ListEntry[] {
  return useMemo(() => toListEntries(appointments, []), [appointments]);
}
