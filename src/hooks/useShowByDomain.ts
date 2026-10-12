import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useHouseholdContext } from './useRouteContext';

export type ShowByDomain = {
  /** False on the main page, which has its own switch. */
  readonly available: boolean;
  /** Opens the main page arranged by domain, keeping the chosen entity. */
  readonly show: () => void;
};

/** The way from any tab to the main page arranged by domain. */
export function useShowByDomain(): ShowByDomain {
  const { setHomeView } = useHouseholdContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const show = useCallback((): void => {
    setHomeView('domain');
    void navigate('/');
  }, [setHomeView, navigate]);
  return { available: pathname !== '/', show };
}
