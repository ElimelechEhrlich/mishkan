import { useState } from 'react';
import type { ReactElement } from 'react';
import { AddRow } from '../ui/AddRow';
import { Icon } from '../ui/Icon';
import { ListRow } from '../ui/ListRow';
import type { IconName } from '../ui/Icon';

type AddEntityRowProps = {
  readonly icon: IconName;
  readonly title: string;
  readonly subtitle?: string | undefined;
  /** The placeholder of the name field. */
  readonly fieldLabel: string;
  /** A note shown under the field. */
  readonly hint?: string | undefined;
  readonly onAdd: (name: string) => void;
};

/** The last row of a group: opens a name field for adding one more. */
export function AddEntityRow({
  icon,
  title,
  subtitle,
  fieldLabel,
  hint,
  onAdd,
}: AddEntityRowProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <li className="group">
      <ListRow
        icon={icon}
        title={title}
        subtitle={subtitle}
        onClick={() => {
          setOpen(!open);
        }}
        trailing={
          <Icon
            name="down"
            className={`size-4 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
          />
        }
      />
      {open && (
        <div className="flex flex-col gap-2 px-3.5 pb-3.5">
          <AddRow
            label={fieldLabel}
            onAdd={(name) => {
              onAdd(name);
              setOpen(false);
            }}
          />
          {hint !== undefined && <p className="text-[13px] leading-5 text-muted">{hint}</p>}
        </div>
      )}
    </li>
  );
}
