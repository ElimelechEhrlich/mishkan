import type { ReactElement } from 'react';

type AvatarProps = {
  readonly name: string;
};

/** A circle with the first letter of a name. */
export function Avatar({ name }: AvatarProps): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary"
    >
      {name.trim().charAt(0)}
    </span>
  );
}
