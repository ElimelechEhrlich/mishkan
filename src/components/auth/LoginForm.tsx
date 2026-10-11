import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { TextField } from '../ui/TextField';
import { AuthShell } from './AuthShell';

type LoginFormProps = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (email: string, password: string) => void;
  /** The sign-up screen, keeping an invite code if there is one. */
  readonly signUpPath: string;
};

export function LoginForm({ busy, error, onSubmit, signUpPath }: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(email.trim(), password);
  }

  return (
    <AuthShell
      switchText={labels.auth.noAccount}
      switchLabel={labels.actions.signUp}
      switchTo={signUpPath}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-card"
      >
        <ErrorBanner message={error} />
        <TextField
          label={labels.fields.email}
          type="email"
          direction="ltr"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <TextField
          label={labels.fields.password}
          type="password"
          direction="ltr"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <Button type="submit" disabled={busy || email.trim() === '' || password === ''}>
          {labels.actions.signIn}
        </Button>
      </form>
    </AuthShell>
  );
}
