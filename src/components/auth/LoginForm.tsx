import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { TextField } from '../ui/TextField';

type LoginFormProps = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (email: string, password: string) => void;
};

export function LoginForm({ busy, error, onSubmit }: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(email.trim(), password);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <img src="/icons/icon.svg" alt="" className="size-20 rounded-3xl shadow-card" />
        <h1 className="font-display text-5xl font-bold">{labels.app.name}</h1>
        <p className="text-muted">{labels.app.tagline}</p>
      </header>
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
    </div>
  );
}
