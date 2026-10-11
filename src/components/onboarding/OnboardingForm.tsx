import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import type { UnclaimedParent } from '../../types/domain';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';

type OnboardingFormProps = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly inviteCode: string;
  readonly onInviteCodeChange: (inviteCode: string) => void;
  /** Parents the household already opened for someone who has not joined yet. */
  readonly unclaimedParents: readonly UnclaimedParent[];
  readonly onCreate: (householdName: string, parentName: string) => void;
  readonly onJoin: (parentName: string, parentEntityId: string | null) => void;
  readonly onSignOut: () => void;
};

type Mode = 'create' | 'join';

const modes = [
  { value: 'create', label: labels.onboarding.createTab },
  { value: 'join', label: labels.onboarding.joinTab },
] as const satisfies readonly { value: Mode; label: string }[];

/**
 * The first parent creates the household; the second joins it with the invite code,
 * either as a parent that was already opened for them or as a new one.
 */
export function OnboardingForm({
  busy,
  error,
  inviteCode,
  onInviteCodeChange,
  unclaimedParents,
  onCreate,
  onJoin,
  onSignOut,
}: OnboardingFormProps): ReactElement {
  const [mode, setMode] = useState<Mode>(inviteCode === '' ? 'create' : 'join');
  const [parentName, setParentName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [claimedId, setClaimedId] = useState<string | null>(null);

  const claimed =
    mode === 'join' ? unclaimedParents.find((parent) => parent.id === claimedId) : undefined;
  const name = claimed?.name ?? parentName.trim();
  const secondValue = mode === 'create' ? householdName.trim() : inviteCode.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (mode === 'create') {
      onCreate(secondValue, name);
    } else {
      onJoin(name, claimed?.id ?? null);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center font-display text-4xl font-bold">{labels.pages.onboarding}</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-card"
      >
        <Segmented options={modes} value={mode} onChange={setMode} />
        <ErrorBanner message={error} />
        {mode === 'join' && (
          <>
            <TextField
              label={labels.fields.inviteCode}
              direction="ltr"
              value={inviteCode}
              onChange={onInviteCodeChange}
            />
            <p className="text-sm text-muted">{labels.onboarding.inviteHint}</p>
          </>
        )}
        {mode === 'join' && unclaimedParents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">{labels.onboarding.whoAreYou}</span>
            <div className="flex flex-wrap gap-2">
              {unclaimedParents.map((parent) => (
                <Chip
                  key={parent.id}
                  label={parent.name}
                  selected={parent.id === claimedId}
                  onClick={() => {
                    setClaimedId(parent.id === claimedId ? null : parent.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {claimed === undefined && (
          <TextField label={labels.fields.yourName} value={parentName} onChange={setParentName} />
        )}
        {mode === 'create' && (
          <TextField
            label={labels.fields.householdName}
            value={householdName}
            onChange={setHouseholdName}
          />
        )}
        <Button type="submit" disabled={busy || name === '' || secondValue === ''}>
          {mode === 'create' ? labels.actions.createHousehold : labels.actions.joinHousehold}
        </Button>
      </form>
      <Button variant="ghost" onClick={onSignOut}>
        {labels.actions.signOut}
      </Button>
    </div>
  );
}
