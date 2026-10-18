import type { ReactElement, ReactNode } from 'react';
import { PropertyChipsContext } from './propertyLayout';

type PropertyChipsProps = {
  readonly children: ReactNode;
};

/**
 * Property rows as a line of small chips. The editor of the open one unfolds under all of
 * them, across the whole width.
 */
export function PropertyChips({ children }: PropertyChipsProps): ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      <PropertyChipsContext.Provider value>{children}</PropertyChipsContext.Provider>
    </div>
  );
}
