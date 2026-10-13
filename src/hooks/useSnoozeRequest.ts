import { useSearchParams } from 'react-router';

/**
 * Whether the item page was opened from "remind me again" on a notification (the address
 * carries ?snooze=1), and how to close that choice, leaving a plain item address.
 */
export function useSnoozeRequest(): { readonly open: boolean; readonly close: () => void } {
  const [searchParams, setSearchParams] = useSearchParams();
  return {
    open: searchParams.get('snooze') === '1',
    close: (): void => {
      setSearchParams({}, { replace: true });
    },
  };
}
