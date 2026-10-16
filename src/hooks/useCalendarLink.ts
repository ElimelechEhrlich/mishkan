import { useCallback, useState } from 'react';
import { toMessage } from '../lib/errors';
import { getCalendarLink, renewCalendarLink } from '../services/calendarService';

export type UseCalendarLink = {
  /** The private link, once asked for. */
  readonly link: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly show: () => void;
  readonly renew: () => void;
};

/** The parent's private Google Calendar link: made when first asked for, and replaceable. */
export function useCalendarLink(): UseCalendarLink {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((request: () => Promise<string>): void => {
    setBusy(true);
    setError(null);
    request()
      .then(setLink)
      .catch((caught: unknown) => {
        setError(toMessage(caught));
      })
      .finally(() => {
        setBusy(false);
      });
  }, []);

  const show = useCallback((): void => {
    load(getCalendarLink);
  }, [load]);
  const renew = useCallback((): void => {
    load(renewCalendarLink);
  }, [load]);

  return { link, busy, error, show, renew };
}
