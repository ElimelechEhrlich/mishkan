import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { useEntities } from '../hooks/useEntities';
import { useOpenOnMain } from '../hooks/useOpenOnMain';
import { useHouseholdContext } from '../hooks/useRouteContext';

/** One address for the personal entity of whoever opens it, the same for both parents. */
const ownPersonal = 'personal';

/**
 * Old and shared links to an entity open the main page on it, arranged by domain.
 * `/entity/personal` opens the personal entity of whoever opens the link.
 */
export function EntityPage(): ReactElement | null {
  const { entityId } = useParams();
  const { member } = useHouseholdContext();
  const { entities, loading } = useEntities();
  const personal = entities.find(
    (entity) => entity.kind === 'personal' && entity.member_id === member.id,
  );
  const wanted = entityId === ownPersonal ? (personal?.id ?? null) : (entityId ?? null);
  useOpenOnMain(wanted, entityId !== ownPersonal || personal !== undefined || !loading);
  return null;
}
