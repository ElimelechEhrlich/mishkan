import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

type QuantityEditorProps = {
  readonly quantity: string | null;
  /** The new quantity; null takes it off. */
  readonly onSave: (quantity: string | null) => void;
};

/** How much of a missing item to buy: free text, such as 3, 2 ק"ג or שישייה. */
export function QuantityEditor({ quantity, onSave }: QuantityEditorProps): ReactElement {
  const [text, setText] = useState(quantity ?? '');
  const trimmed = text.trim();
  return (
    <div className="flex flex-col gap-3">
      <TextField
        label={labels.shopping.quantity}
        value={text}
        onChange={setText}
        compact
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          onClick={() => {
            onSave(trimmed === '' ? null : trimmed.slice(0, 40));
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
            {labels.shopping.noQuantity}
          </Button>
        )}
      </div>
    </div>
  );
}
