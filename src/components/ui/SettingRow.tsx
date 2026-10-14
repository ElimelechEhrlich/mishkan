import type { ReactElement, ReactNode } from 'react';

type SettingRowProps = {
  readonly label: string;
  /** A line under the controls, such as what is left of a series. */
  readonly note?: string | undefined;
  readonly children: ReactNode;
};

/** One setting inside a settings card: its small heading and its controls. */
export function SettingRow({ label, note, children }: SettingRowProps): ReactElement {
  return (
    <div className="flex flex-col gap-2 py-3">
      <span className="text-xs font-bold tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {note !== undefined && <p className="text-[13px] text-muted">{note}</p>}
    </div>
  );
}
