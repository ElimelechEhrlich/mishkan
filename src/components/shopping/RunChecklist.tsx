import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Item, ShoppingRun } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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
      <Card
        title={labels.shopping.toBuy}
        aside={
          <span className="text-[13px] font-bold text-primary">
            {labels.shopping.progress} {String(bought.length)} {labels.shopping.of}{' '}
            {String(run.items.length)}
          </span>
        }
      >
        <ul className="flex flex-col divide-y divide-line">
          {[...open, ...bought].map((item) => (
            <MissingItemRow
              key={item.id}
              item={item}
              entityName={item.domain_id === null ? undefined : entityNames.get(item.domain_id)}
              onToggle={onToggle}
            />
          ))}
        </ul>
      </Card>
      <Button
        variant="soft"
        onClick={() => {
          onFinish(run.run);
        }}
      >
        {labels.actions.finishRun}
      </Button>
      {open.length > 0 && <p className="text-center text-sm text-muted">{labels.shopping.finishHint}</p>}
    </div>
  );
}
