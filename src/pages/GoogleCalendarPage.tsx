import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { labels } from '../constants/labels';
import { useGoogleReturn } from '../hooks/useGoogleCalendar';

/** Where Google returns after the parent agreed (or not) to connect the household's calendar. */
export function GoogleCalendarPage(): ReactElement {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { result, error } = useGoogleReturn(search);

  // Once connected, back to the settings, where the calendar shows as connected.
  useEffect(() => {
    if (result !== 'done') {
      return;
    }
    const timer = window.setTimeout(() => {
      void navigate('/settings', { replace: true });
    }, 1500);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [result, navigate]);

  const text =
    result === 'working'
      ? labels.google.returnWorking
      : result === 'done'
        ? labels.google.returnDone
        : result === 'refused'
          ? labels.google.returnRefused
          : error === null
            ? labels.google.returnFailed
            : `${labels.google.returnFailed} (${error})`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      {result === 'working' && (
        <span className="size-8 animate-spin rounded-full border-3 border-primary-soft border-t-primary" />
      )}
      <p className={`text-[16px] ${result === 'failed' ? 'text-alert' : ''}`} role="status">
        {text}
      </p>
      {result !== 'working' && (
        <Link
          to="/settings"
          replace
          className="rounded-full bg-primary-soft px-4 py-2 text-[14px] font-semibold text-primary transition active:scale-[0.97]"
        >
          {labels.google.toSettings}
        </Link>
      )}
    </main>
  );
}
