import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { byDepartment } from '../../lib/departments';
import type { RunView } from '../../hooks/useRunView';
import type { Item, ShoppingDepartment, ShoppingRun } from '../../types/domain';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { DepartmentHeader } from './DepartmentHeader';
import { MissingItemRow } from './MissingItemRow';

type RunChecklistProps = {
  readonly run: ShoppingRun;
  readonly entityNames: ReadonlyMap<string, string>;
  /** The household's departments, for a supermarket run; null for a run of another kind. */
  readonly departments: readonly ShoppingDepartment[] | null;
  /** An item's name to the department chosen for it. */
  readonly chosen: ReadonlyMap<string, string>;
  readonly view: RunView;
  readonly onViewChange: (view: RunView) => void;
  readonly onToggle: (item: Item) => void;
  readonly onFinish: (run: Item) => void;
};

/** Not yet bought first, each part in the order the items were added. */
function openFirst(items: readonly Item[]): Item[] {
  const added = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return [
    ...added.filter((item) => item.status === 'open'),
    ...added.filter((item) => item.status !== 'open'),
  ];
}

/**
 * The list to shop by. A supermarket run is shown by department, in the order the shop is
 * walked, each department folding once all of it is bought; it can also be shown as the
 * items were added. Ticking the last item closes the run; "finish" closes it earlier, and
 * whatever was not ticked goes back to the shopping list.
 */
export function RunChecklist({
  run,
  entityNames,
  departments,
  chosen,
  view,
  onViewChange,
  onToggle,
  onFinish,
}: RunChecklistProps): ReactElement {
  /** Departments opened or folded by hand; the rest fold once all of them is bought. */
  const [folding, setFolding] = useState<ReadonlyMap<string, boolean>>(new Map());
  const bought = run.items.filter((item) => item.status === 'done');
  const sorted = departments !== null && view === 'departments';

  function row(item: Item): ReactElement {
    return (
      <MissingItemRow
        key={item.id}
        item={item}
        entityName={item.domain_id === null ? undefined : entityNames.get(item.domain_id)}
        onToggle={onToggle}
      />
    );
  }

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
        {departments !== null && (
          <div className="flex flex-col gap-1">
            <Segmented
              options={[
                { value: 'departments', label: labels.departments.byDepartment },
                { value: 'added', label: labels.departments.byAdded },
              ]}
              value={view}
              onChange={onViewChange}
            />
            {sorted && (
              <p className="flex items-center gap-1.5 px-1 text-xs text-muted">
                {labels.departments.sortedNote}
                <span aria-hidden>·</span>
                <Link to="/shopping/departments" className="font-semibold text-primary">
                  {labels.departments.changeOrder}
                </Link>
              </p>
            )}
          </div>
        )}
        <ul className="overflow-hidden rounded-2xl bg-surface shadow-card">
          {sorted
            ? byDepartment(run.items, departments, chosen).flatMap((group) => {
                const id = group.department?.id ?? 'other';
                const boughtHere = group.items.filter((item) => item.status === 'done').length;
                const folded = folding.get(id) ?? boughtHere === group.items.length;
                return [
                  <DepartmentHeader
                    key={`department-${id}`}
                    name={group.department?.name ?? labels.departments.other}
                    bought={boughtHere}
                    total={group.items.length}
                    folded={folded}
                    onToggle={() => {
                      setFolding(new Map(folding).set(id, !folded));
                    }}
                  />,
                  ...(folded ? [] : openFirst(group.items).map(row)),
                ];
              })
            : openFirst(run.items).map(row)}
        </ul>
      </section>
      <Button
        onClick={() => {
          onFinish(run.run);
        }}
      >
        {labels.actions.finishRun}
      </Button>
      {bought.length < run.items.length && (
        <p className="text-center text-[13px] text-muted">{labels.shopping.finishHint}</p>
      )}
    </div>
  );
}
