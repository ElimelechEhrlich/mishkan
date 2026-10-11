import type { ReactElement, ReactNode } from 'react';

type ButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'quiet';
  readonly disabled?: boolean;
};

const variantClasses = {
  primary: 'bg-primary text-white disabled:bg-line disabled:text-faint',
  soft: 'bg-primary-soft text-primary disabled:opacity-40',
  ghost: 'bg-surface text-ink shadow-card disabled:opacity-40',
  danger: 'bg-alert-soft text-alert disabled:opacity-40',
  quiet: 'bg-surface text-alert shadow-card disabled:opacity-40',
} as const;

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
}: ButtonProps): ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition active:scale-[0.98] ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
