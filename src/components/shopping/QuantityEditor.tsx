import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

type QuantityEditorProps = {
  readonly quantity: string | null;
  /** The new quantity; null takes it off. */
  readonly onSave: (quantity: string | null) => void;
  /** The field's name and the way to take it off, for another short text (the details). */
  readonly label?: string;
  readonly clearLabel?: string;
  readonly max?: number;
};

/**
 * How much of a missing item to buy: free text, such as 3, 2 ק"ג or שישייה. With another
 * label, any short text of it, such as its brand or kind.
 */
export function QuantityEditor({
  quantity,
  onSave,
  label = labels.shopping.quantity,
  clearLabel = labels.shopping.noQuantity,
  max = 40,
}: QuantityEditorProps): ReactElement {
  const [text, setText] = useState(quantity ?? '');
  const trimmed = text.trim();
  return (
    <div className="flex flex-col gap-3">
      <TextField label={label} value={text} onChange={setText} compact autoFocus />
      <div className="flex gap-2">
        <Button
          onClick={() => {
            onSave(trimmed === '' ? null : trimmed.slice(0, max));
          }}
        >
          {labels.actions.save}
        </Button>
        {quantity !== null && (
          <Button
            variant="ghost"
            onClick={() => {
              onSave(null);
            }}
          >
            {clearLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
