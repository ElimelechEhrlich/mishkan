import { useId } from 'react';
import type { ReactElement } from 'react';

type TextAreaProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
};

export function TextArea({ label, value, onChange }: TextAreaProps): ReactElement {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base focus:border-primary focus:outline-none"
      />
    </div>
  );
}
