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
