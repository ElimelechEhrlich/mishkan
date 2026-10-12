import type { ReactElement } from 'react';
import { useOpenOnMain } from '../hooks/useOpenOnMain';

/** The domains of every entity are the main page on everything, arranged by domain. */
export function DomainsPage(): ReactElement | null {
  useOpenOnMain(null);
  return null;
}
