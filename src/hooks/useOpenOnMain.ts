import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useHouseholdContext } from './useRouteContext';

/**
 * An entity's page, or the domains of everything, is the main page arranged by domain:
 * chooses the entity (or everything) and that arrangement, then goes there in place of
 * the old address.
 */
export function useOpenOnMain(entityId: string | null): void {
  const { setScope, setHomeView } = useHouseholdContext();
  const navigate = useNavigate();
  useEffect(() => {
    setScope(entityId);
    setHomeView('domain');
    void navigate('/', { replace: true });
  }, [entityId, setScope, setHomeView, navigate]);
}
