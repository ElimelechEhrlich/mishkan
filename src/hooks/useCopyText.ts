import { useCallback, useEffect, useState } from 'react';

export type UseCopyText = {
  /** True for a moment after the text was copied. */
  readonly copied: boolean;
  readonly copy: (text: string) => void;
};

const copiedForMs = 2000;

/** Copies text to the clipboard and says so for a moment. */
export function useCopyText(): UseCopyText {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, copiedForMs);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  const copy = useCallback((text: string): void => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        // Without clipboard access the code stays selectable on screen.
        setCopied(false);
      });
  }, []);

  return { copied, copy };
}
