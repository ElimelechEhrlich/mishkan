import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { useOpenOnMain } from '../hooks/useOpenOnMain';

/** Old and shared links to an entity open the main page on it, arranged by domain. */
export function EntityPage(): ReactElement | null {
  const { entityId } = useParams();
  useOpenOnMain(entityId ?? null);
  return null;
}
