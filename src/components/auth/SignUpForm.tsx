import { useState } from "react";
import type { ReactElement, SyntheticEvent } from "react";
import { labels } from "../../constants/labels";
import { Button } from "../ui/Button";
import { ErrorBanner } from "../ui/ErrorBanner";
import { TextField } from "../ui/TextField";
import { AuthShell } from "./AuthShell";

type SignUpFormProps = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (email: string, password: string) => void;
  /** The sign-in screen, keeping an invite code if there is one. */
  readonly signInPath: string;
};

/** Supabase refuses shorter passwords. */
const minPasswordLength = 6;

/** A new account: email, and a password typed twice. */
export function SignUpForm({
  busy,
  error,
  onSubmit,
  signInPath,
}: SignUpFormProps): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");

  const tooShort = password.length < minPasswordLength;
  const differ = again !== "" && again !== password;
  const canSubmit =
    !busy && email.trim() !== "" && !tooShort && again === password;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (canSubmit) {
      onSubmit(email.trim(), password);
    }
  }

  return (
    <AuthShell
      switchText={labels.auth.hasAccount}
      switchLabel={labels.actions.signIn}
      switchTo={signInPath}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-card"
      >
        <h2 className="font-display text-lg font-semibold">
          {labels.auth.signUpTitle}
        </h2>
        <ErrorBanner message={error} />
        <TextField
          label={labels.fields.email}
          type="email"
          direction="ltr"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <div className="flex flex-col gap-1">
          <TextField
            label={labels.fields.password}
            type="password"
            direction="ltr"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />
          <p
            className={`px-0.5 text-xs ${password !== "" && tooShort ? "text-alert" : "text-muted"}`}
          >
            {labels.auth.passwordHint}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <TextField
            label={labels.fields.passwordAgain}
            type="password"
            direction="ltr"
            autoComplete="new-password"
            value={again}
            onChange={setAgain}
          />
          {differ && (
            <p className="px-0.5 text-xs text-alert">
              {labels.auth.passwordsDiffer}
            </p>
          )}
        </div>
        <Button type="submit" disabled={!canSubmit}>
          {labels.actions.signUp}
        </Button>
      </form>
    </AuthShell>
  );
}
