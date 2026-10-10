import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
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

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(email.trim(), password);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6"
    >
      <h1 className="border-b border-ink pb-3 text-4xl font-bold">{labels.app.name}</h1>
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
  );
}
