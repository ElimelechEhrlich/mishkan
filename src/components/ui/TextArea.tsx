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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="px-0.5 text-[13px] font-medium text-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed transition focus:border-primary focus:ring-3 focus:ring-primary/12 focus:outline-none"
      />
    </div>
  );
}
