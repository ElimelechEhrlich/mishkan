import { useEffect, useState } from 'react';
import { useHouseholdContext } from './useRouteContext';

/**
 * With a domain chosen, the main page is arranged by domain: when it is chosen there, and
 * when the main page opens (from the bottom bar) with one already chosen on another tab.
 * The arrangement can still be switched back by hand. Returns how to choose a domain.
 */
export function useTopicHomeView(): (topic: string | null) => void {
  const { topic, setTopic, setHomeView } = useHouseholdContext();

  // The domain chosen as the main page opened; it does not change afterwards.
  const [openedWith] = useState(topic);
  useEffect(() => {
    if (openedWith !== null) {
      setHomeView('domain');
    }
  }, [openedWith, setHomeView]);

  return (next: string | null): void => {
    setTopic(next);
    if (next !== null) {
      setHomeView('domain');
    }
  };
}
