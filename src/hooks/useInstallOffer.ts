import { useSyncExternalStore } from 'react';
import { installOffered, onInstallOfferChange, showInstallOffer } from '../lib/installPrompt';

export type UseInstallOffer = {
  /** Whether the browser offers to install the app now. */
  readonly offered: boolean;
  readonly install: () => void;
};

/** The browser's offer to install the site as an app, for a button of our own. */
export function useInstallOffer(): UseInstallOffer {
  const offered = useSyncExternalStore(onInstallOfferChange, installOffered);
  return { offered, install: showInstallOffer };
}
