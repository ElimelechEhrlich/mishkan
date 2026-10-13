import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from './Icon';

type CopyButtonProps = {
  readonly text: string;
};

/** How long the tick stays after copying, in milliseconds. */
const tickMs = 1500;

/** Copies a value in one tap, and shows a tick for a moment once it is copied. */
export function CopyButton({ text }: CopyButtonProps): ReactElement {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, tickMs);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={copied ? labels.data.copied : labels.data.copy}
      onClick={(event) => {
        // Inside a row that opens the item, copying does not open it.
        event.preventDefault();
        event.stopPropagation();
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
        });
      }}
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition active:scale-90 ${
        copied ? 'bg-primary-soft text-primary' : 'bg-paper text-muted'
      }`}
    >
      <Icon name={copied ? 'check' : 'copy'} className="size-4" />
    </button>
  );
}
