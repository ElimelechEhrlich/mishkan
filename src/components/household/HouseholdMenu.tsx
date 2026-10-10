import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';

type HouseholdMenuProps = {
  readonly inviteCode: string;
  readonly onSignOut: () => void;
};

const linkClass = 'text-sm underline underline-offset-4';

/** Header actions: reveal the invite code for the second parent, and sign out. */
export function HouseholdMenu({ inviteCode, onSignOut }: HouseholdMenuProps): ReactElement {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-4">
        <button
          type="button"
          aria-expanded={showCode}
          onClick={() => {
            setShowCode(!showCode);
          }}
          className={linkClass}
        >
          {labels.actions.showInviteCode}
        </button>
        <button type="button" onClick={onSignOut} className={linkClass}>
          {labels.actions.signOut}
        </button>
      </div>
      {showCode && (
        <code dir="ltr" className="border border-ink bg-surface px-2 py-1 text-xs select-all">
          {inviteCode}
        </code>
      )}
    </div>
  );
}
