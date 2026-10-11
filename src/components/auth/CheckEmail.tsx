import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';
import { AuthShell } from './AuthShell';

type CheckEmailProps = {
  readonly email: string;
  readonly signInPath: string;
};

/** After signing up, when the address has to be confirmed through the email that was sent. */
export function CheckEmail({ email, signInPath }: CheckEmailProps): ReactElement {
  return (
    <AuthShell switchText="" switchLabel={labels.auth.backToSignIn} switchTo={signInPath}>
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-6 text-center shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon name="check" className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold">{labels.auth.checkEmailTitle}</h2>
        <p className="text-[15px] leading-6">
          {labels.auth.checkEmailText}{' '}
          <span dir="ltr" className="font-semibold">
            {email}
          </span>
        </p>
        <p className="text-[13px] text-muted">{labels.auth.checkEmailSpam}</p>
      </div>
    </AuthShell>
  );
}
