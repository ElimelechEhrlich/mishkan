import type { ReactElement, ReactNode } from 'react';

type ButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  readonly disabled?: boolean;
};

const variantClasses = {
  primary: 'bg-primary text-white',
  soft: 'bg-primary-soft text-primary',
  ghost: 'border border-line bg-transparent text-ink',
  danger: 'bg-alert-soft text-alert',
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-medium transition active:scale-[0.98] disabled:opacity-40 ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
