import { useState } from "react";
import type { ReactElement } from "react";
import { labels } from "../../constants/labels";
import { Icon } from "./Icon";

type InlineAddChipProps = {
  /** Shown on the chip, after a plus. */
  readonly label: string;
  /** The placeholder of the field. */
  readonly placeholder: string;
  /** Resolves when the new thing is saved; the field closes then. */
  readonly onAdd: (name: string) => Promise<unknown>;
};

/**
 * A dashed chip at the end of a row of chips that opens into a short field for adding
 * one more. It is not a form of its own, so it can sit inside another form.
 */
export function InlineAddChip({
  label,
  placeholder,
  onAdd,
}: InlineAddChipProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft("");
        }}
        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-faint px-3 py-1 text-[13px] font-medium text-muted transition active:scale-[0.97]"
      >
        <Icon name="plus" className="size-3.5" />
        {label}
      </button>
    );
  }

  const trimmed = draft.trim();

  function add(): void {
    if (trimmed === "" || saving) {
      return;
    }
    setSaving(true);
    void onAdd(trimmed).finally(() => {
      setSaving(false);
      setDraft(null);
    });
  }

  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface ps-3 pe-1 shadow-card">
      <input
        value={draft}
        autoFocus
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
          if (event.key === "Escape") {
            setDraft(null);
          }
        }}
        className="w-28 bg-transparent text-[13px] placeholder:text-faint focus:outline-none"
      />
      <button
        type="button"
        aria-label={labels.actions.add}
        disabled={trimmed === "" || saving}
        onClick={add}
        className="flex size-6 items-center justify-center rounded-full bg-primary text-white disabled:bg-line disabled:text-faint"
      >
        <Icon name="check" className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={labels.actions.close}
        onClick={() => {
          setDraft(null);
        }}
        className="flex size-6 items-center justify-center rounded-full text-muted"
      >
        <Icon name="close" className="size-3.5" />
      </button>
    </span>
  );
}
