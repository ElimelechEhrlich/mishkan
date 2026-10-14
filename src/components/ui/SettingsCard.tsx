import type { ReactElement, ReactNode } from 'react';

type SettingsCardProps = {
  /** The settings in one sentence, at the head of the card. */
  readonly summary?: string | undefined;
  readonly children: ReactNode;
  /** Buttons that act on the settings (save, cancel), kept apart at the bottom. */
  readonly actions?: ReactNode;
};

/**
 * The settings a choice opens (its second level): set in from the choice, on a background of
 * its own, a row per setting.
 */
export function SettingsCard({ summary, children, actions }: SettingsCardProps): ReactElement {
  return (
    <div className="ms-2 flex animate-fade-in flex-col rounded-xl border-s-2 border-primary/40 bg-paper">
      {summary !== undefined && (
        <p className="px-3.5 pt-3 text-[15px] font-semibold text-primary">{summary}</p>
      )}
      <div className="flex flex-col divide-y divide-line px-3.5">{children}</div>
      {actions !== undefined && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-3">
          {actions}
        </div>
      )}
    </div>
  );
}
