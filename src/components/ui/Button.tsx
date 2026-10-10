import type { ReactElement, ReactNode } from 'react';

type ButtonProps = {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: 'primary' | 'ghost';
  readonly disabled?: boolean;
};

const variantClasses = {
  primary: 'border-ink bg-ink text-paper',
  ghost: 'border-ink bg-transparent text-ink',
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
      className={`min-h-12 border px-4 py-2 font-medium disabled:opacity-40 ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
