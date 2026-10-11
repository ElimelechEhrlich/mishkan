import type { ReactElement } from "react";
import { Navigate } from "react-router";
import { CheckEmail } from "../components/auth/CheckEmail";
import { SignUpForm } from "../components/auth/SignUpForm";
import { StatusScreen } from "../components/ui/StatusScreen";
import { labels } from "../constants/labels";
import { useAuthPaths } from "../hooks/useAuthPaths";
import { useSession } from "../hooks/useSession";

export function SignUpPage(): ReactElement {
  const { session, loading, busy, error, confirmationSentTo, signUp } =
    useSession();
  const paths = useAuthPaths();

  if (loading) {
    return <StatusScreen text={labels.status.loading} />;
  }
  if (session !== null) {
    return <Navigate to={paths.afterSignIn} replace />;
  }
  if (confirmationSentTo !== null) {
    return <CheckEmail email={confirmationSentTo} signInPath={paths.signIn} />;
  }
  return (
    <SignUpForm
      busy={busy}
      error={error}
      signInPath={paths.signIn}
      onSubmit={(email, password) => {
        signUp(email, password, paths.confirmRedirect);
      }}
    />
  );
}
