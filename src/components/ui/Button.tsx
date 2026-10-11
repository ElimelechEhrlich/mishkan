import type { ReactElement, ReactNode } from 'react';

type ButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  readonly disabled?: boolean;
};

const variantClasses = {
  primary: 'bg-primary text-white shadow-card disabled:bg-line disabled:text-muted disabled:shadow-none',
  soft: 'bg-primary-soft text-primary disabled:opacity-40',
  ghost: 'border border-line bg-transparent text-ink disabled:opacity-40',
  danger: 'bg-alert-soft text-alert disabled:opacity-40',
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition active:scale-[0.98] ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
