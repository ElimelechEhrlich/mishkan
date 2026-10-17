import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import {
  getCalendarLink,
  googleCalendarAddUrl,
  renewCalendarLink,
} from '../services/calendarService';

export type UseCalendarLink = {
  /** The private link, once asked for. */
  readonly link: string | null;
  /** Google Calendar's page that adds the link's calendar, once there is a link. */
  readonly addUrl: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly show: () => void;
  readonly renew: () => void;
};

/** The parent's private Google Calendar link: made when the card first shows, and replaceable. */
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
  // Ready when the card shows, so the button opens Google Calendar at once.
  useEffect(() => {
    show();
  }, [show]);
  const renew = useCallback((): void => {
    load(renewCalendarLink);
  }, [load]);

  const addUrl = link === null ? null : googleCalendarAddUrl(link);

  return { link, addUrl, busy, error, show, renew };
}
