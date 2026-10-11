import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router";
import { labels } from "../../constants/labels";

type AuthShellProps = {
  readonly children: ReactNode;
  /** A line under the card that leads to the other screen, such as signing up. */
  readonly switchText: string;
  readonly switchLabel: string;
  readonly switchTo: string;
};

/** The frame of the sign-in and sign-up screens: the name of the app, a card, and a way across. */
export function AuthShell({
  children,
  switchText,
  switchLabel,
  switchTo,
}: AuthShellProps): ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <img
          src="/icons/icon.svg"
          alt=""
          className="size-20 rounded-3xl shadow-card"
        />
        <h1 className="font-display text-5xl font-bold">{labels.app.name}</h1>
        <p className="text-muted">{labels.app.tagline}</p>
      </header>
      {children}
      <p className="text-center text-sm text-muted">
        {switchText}{" "}
        <Link to={switchTo} className="font-semibold text-primary">
          {switchLabel}
        </Link>
      </p>
    </div>
  );
}
