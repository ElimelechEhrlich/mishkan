import { useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';

type ShoppingListFieldProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly autoFocus?: boolean;
  /** Larger text, for the head of the add sheet. */
  readonly large?: boolean;
};

/**
 * What is missing, written as a chat message: Enter starts a new line, and each line is an
 * item. It grows with what is written.
 */
export function ShoppingListField({
  value,
  onChange,
  autoFocus = false,
  large = false,
}: ShoppingListFieldProps): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = field.current;
    if (element !== null) {
      element.style.height = 'auto';
      element.style.height = `${String(element.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={field}
      value={value}
      rows={large ? 2 : 3}
      autoFocus={autoFocus}
      autoComplete="off"
      enterKeyHint="enter"
      aria-label={labels.shopping.listPrompt}
      placeholder={labels.shopping.listPrompt}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className={
        large
          ? 'max-h-[40dvh] w-full resize-none bg-transparent px-1 py-1 text-xl leading-snug font-medium placeholder:text-faint focus:outline-none focus-visible:outline-none'
          : 'max-h-[50dvh] w-full resize-none rounded-xl bg-paper px-3.5 py-3 text-[15px] leading-relaxed placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
      }
    />
  );
}
