import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Item, ShoppingRun } from '../../types/domain';
import { Button } from '../ui/Button';
import { MissingItemRow } from './MissingItemRow';

type RunChecklistProps = {
  readonly run: ShoppingRun;
  readonly entityNames: ReadonlyMap<string, string>;
  readonly onToggle: (item: Item) => void;
  readonly onFinish: (run: Item) => void;
};

/**
 * The list to shop by. Ticking the last item closes the run; "finish" closes it
 * earlier, and whatever was not ticked goes back to the shopping list.
 */
export function RunChecklist({
  run,
  entityNames,
  onToggle,
  onFinish,
}: RunChecklistProps): ReactElement {
  const open = run.items.filter((item) => item.status === 'open');
  const bought = run.items.filter((item) => item.status === 'done');

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold tracking-wide text-muted">{labels.shopping.toBuy}</h2>
          <span className="text-xs font-semibold text-primary">
            {labels.shopping.progress} {String(bought.length)} {labels.shopping.of}{' '}
            {String(run.items.length)}
          </span>
        </div>
        <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
          {[...open, ...bought].map((item) => (
            <MissingItemRow
              key={item.id}
              item={item}
              entityName={item.domain_id === null ? undefined : entityNames.get(item.domain_id)}
              onToggle={onToggle}
            />
          ))}
        </ul>
      </section>
      <Button
        onClick={() => {
          onFinish(run.run);
        }}
      >
        {labels.actions.finishRun}
      </Button>
      {open.length > 0 && (
        <p className="text-center text-[13px] text-muted">{labels.shopping.finishHint}</p>
      )}
    </div>
  );
}
