import { useCallback, useState } from 'react';

export type AddRequest = { readonly domainId: string; readonly key: number };

export type UseAddRequest = {
  /** Set when the add sheet should open on a domain; a new `key` each time it is asked for. */
  readonly request: AddRequest | null;
  readonly requestAdd: (domainId: string) => void;
};

/** Opening the add sheet on a chosen domain, from the "+" beside it. */
export function useAddRequest(): UseAddRequest {
  const [request, setRequest] = useState<AddRequest | null>(null);
  const requestAdd = useCallback((domainId: string): void => {
    setRequest((previous) => ({ domainId, key: (previous?.key ?? 0) + 1 }));
  }, []);
  return { request, requestAdd };
}

export type UseAddOpener = {
  /** A new number each time the sheet is asked for; 0 until then. */
  readonly key: number;
  readonly open: () => void;
};

/** Opening the add sheet from a button of the page's own, such as in the bar at the bottom. */
export function useAddOpener(): UseAddOpener {
  const [key, setKey] = useState(0);
  const open = useCallback((): void => {
    setKey((previous) => previous + 1);
  }, []);
  return { key, open };
}
