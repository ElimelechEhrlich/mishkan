import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ErrorBanner } from '../ui/ErrorBanner';
import { TextField } from '../ui/TextField';

type OnboardingFormProps = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onCreate: (householdName: string, parentName: string) => void;
  readonly onJoin: (inviteCode: string, parentName: string) => void;
  readonly onSignOut: () => void;
};

type Mode = 'create' | 'join';

/** The first parent creates the household; the second joins it with the invite code. */
export function OnboardingForm({
  busy,
  error,
  onCreate,
  onJoin,
  onSignOut,
}: OnboardingFormProps): ReactElement {
  const [mode, setMode] = useState<Mode>('create');
  const [parentName, setParentName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const name = parentName.trim();
  const secondValue = mode === 'create' ? householdName.trim() : inviteCode.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (mode === 'create') {
      onCreate(secondValue, name);
    } else {
      onJoin(secondValue, name);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6"
    >
      <h1 className="border-b border-ink pb-3 text-3xl font-bold">{labels.pages.onboarding}</h1>
      <div className="flex gap-2">
        <Chip
          label={labels.onboarding.createTab}
          selected={mode === 'create'}
          onClick={() => {
            setMode('create');
          }}
        />
        <Chip
          label={labels.onboarding.joinTab}
          selected={mode === 'join'}
          onClick={() => {
            setMode('join');
          }}
        />
      </div>
      <ErrorBanner message={error} />
      <TextField label={labels.fields.yourName} value={parentName} onChange={setParentName} />
      {mode === 'create' ? (
        <TextField
          label={labels.fields.householdName}
          value={householdName}
          onChange={setHouseholdName}
        />
      ) : (
        <>
          <TextField
            label={labels.fields.inviteCode}
            direction="ltr"
            value={inviteCode}
            onChange={setInviteCode}
          />
          <p className="text-sm text-muted">{labels.onboarding.inviteHint}</p>
        </>
      )}
      <Button type="submit" disabled={busy || name === '' || secondValue === ''}>
        {mode === 'create' ? labels.actions.createHousehold : labels.actions.joinHousehold}
      </Button>
      <Button variant="ghost" onClick={onSignOut}>
        {labels.actions.signOut}
      </Button>
    </form>
  );
}
