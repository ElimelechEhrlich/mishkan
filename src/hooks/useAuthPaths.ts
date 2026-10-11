import { useSearchParams } from 'react-router';

export type AuthPaths = {
  readonly signIn: string;
  readonly signUp: string;
  /** Where a signed-in parent goes: onboarding with the invite code, or the main page. */
  readonly afterSignIn: string;
  /** The full address the email confirmation link leads to. */
  readonly confirmRedirect: string;
};

/** The sign-in and sign-up screens pass an invite code along, so it is not lost on the way. */
export function useAuthPaths(): AuthPaths {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const query = code === null ? '' : `?code=${encodeURIComponent(code)}`;
  return {
    signIn: `/login${query}`,
    signUp: `/signup${query}`,
    afterSignIn: code === null ? '/' : `/onboarding${query}`,
    confirmRedirect: `${window.location.origin}${code === null ? '/' : `/onboarding${query}`}`,
  };
}
