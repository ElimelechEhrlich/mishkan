import { useState } from 'react';
import type { PointerEvent, ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ShoppingDepartment } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { ConfirmIconButton } from '../ui/ConfirmIconButton';
import { Icon } from '../ui/Icon';
import { InlineEdit } from '../ui/InlineEdit';

type DepartmentOrderListProps = {
  /** In the order the shop is walked. */
  readonly departments: readonly ShoppingDepartment[];
  readonly onReorder: (departmentIds: readonly string[]) => void;
  readonly onRename: (departmentId: string, name: string) => void;
  readonly onRemove: (departmentId: string) => void;
  readonly onAdd: (name: string) => void;
};

type Drag = {
  readonly id: string;
  readonly from: number;
  readonly startY: number;
  /** The height of a row, to tell how many places the finger went. */
  readonly step: number;
  readonly to: number;
  /** How far the finger went from where it started. */
  readonly offset: number;
};

function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  const [taken] = copy.splice(from, 1);
  if (taken !== undefined) {
    copy.splice(to, 0, taken);
  }
  return copy;
}

/**
 * The departments numbered in the order the shop is walked. Each is dragged by its dots to
 * its place; the order is saved when it is let go. A name can be changed, a department
 * deleted, and a new one added at the end.
 */
export function DepartmentOrderList({
  departments,
  onReorder,
  onRename,
  onRemove,
  onAdd,
}: DepartmentOrderListProps): ReactElement {
  const [drag, setDrag] = useState<Drag | null>(null);

  /**
   * Where a row is drawn while one is dragged: the dragged one follows the finger, and those it
   * passed make room. The rows themselves stay in place until it is let go.
   */
  function shift(index: number): number {
    if (drag === null) {
      return 0;
    }
    if (index === drag.from) {
      return drag.offset;
    }
    if (drag.from < index && index <= drag.to) {
      return -drag.step;
    }
    if (drag.to <= index && index < drag.from) {
      return drag.step;
    }
    return 0;
  }

  /** The number a row shows: its place once the drag ends. */
  function place(index: number): number {
    if (drag === null) {
      return index + 1;
    }
    if (index === drag.from) {
      return drag.to + 1;
    }
    return index + 1 + Math.sign(shift(index));
  }

  function start(event: PointerEvent<HTMLButtonElement>, id: string, from: number): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    const row = event.currentTarget.closest('li');
    setDrag({
      id,
      from,
      to: from,
      startY: event.clientY,
      step: row?.offsetHeight ?? 52,
      offset: 0,
    });
  }

  function follow(event: PointerEvent<HTMLButtonElement>): void {
    if (drag === null) {
      return;
    }
    const offset = event.clientY - drag.startY;
    const places = Math.round(offset / drag.step);
    const to = Math.min(departments.length - 1, Math.max(0, drag.from + places));
    setDrag({ ...drag, to, offset });
  }

  function end(): void {
    if (drag !== null && drag.to !== drag.from) {
      onReorder(moved(departments, drag.from, drag.to).map((department) => department.id));
    }
    setDrag(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 px-1 text-[13px] text-muted">
        <Icon name="grip" className="mt-0.5 size-4 shrink-0 text-primary" />
        {labels.departments.dragHint}
      </p>
      <ol className="rounded-2xl bg-surface shadow-card">
        {departments.map((department, index) => {
          const dragged = drag?.id === department.id;
          return (
            <li
              key={department.id}
              style={{ transform: `translateY(${String(shift(index))}px)` }}
              className={`flex items-center gap-2 border-t border-line px-1 first:rounded-t-2xl first:border-t-0 last:rounded-b-2xl ${
                dragged
                  ? 'relative z-10 rounded-2xl bg-primary-soft shadow-raised'
                  : `bg-surface ${drag === null ? '' : 'transition-transform'}`
              }`}
            >
              <button
                type="button"
                aria-label={labels.departments.drag}
                onPointerDown={(event) => {
                  start(event, department.id, index);
                }}
                onPointerMove={follow}
                onPointerUp={end}
                onPointerCancel={end}
                className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:text-primary"
              >
                <Icon name="grip" className="size-5" />
              </button>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {String(place(index))}
              </span>
              <InlineEdit
                value={department.name}
                onSave={(name) => {
                  onRename(department.id, name);
                }}
                textClass="text-[15px] font-medium"
              />
              <ConfirmIconButton
                label={labels.departments.remove}
                confirmLabel={labels.departments.confirmRemove}
                onConfirm={() => {
                  onRemove(department.id);
                }}
              />
            </li>
          );
        })}
      </ol>
      <p className="px-1 text-xs text-muted">{labels.departments.otherHint}</p>
      <AddRow label={labels.departments.newDepartment} onAdd={onAdd} />
    </div>
  );
}
