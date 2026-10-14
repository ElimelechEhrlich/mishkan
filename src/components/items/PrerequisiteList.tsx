import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { usePrerequisites } from '../../hooks/usePrerequisites';
import type { Item } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { CheckButton } from '../ui/CheckButton';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SelectField } from '../ui/SelectField';

type PrerequisiteListProps = {
  readonly item: Item;
  /** Open items this one may depend on. */
  readonly candidates: readonly Item[];
  readonly onChange: () => void;
};

/** What a waiting item depends on: hand-ticked conditions, and other items. */
export function PrerequisiteList({
  item,
  candidates,
  onChange,
}: PrerequisiteListProps): ReactElement {
  const { prerequisites, error, addCondition, addDependency, setMet, remove } = usePrerequisites(
    item.id,
    onChange,
  );
  const titles = new Map(candidates.map((candidate) => [candidate.id, candidate.title]));
  const usedIds = new Set(prerequisites.map((prerequisite) => prerequisite.depends_on_item_id));
  const options = candidates
    // Only what gets done can be waited on: a note, a tracker or a repeating task never is.
    .filter(
      (candidate) =>
        candidate.id !== item.id &&
        !usedIds.has(candidate.id) &&
        (candidate.kind === 'goal' ||
          candidate.kind === 'issue' ||
          candidate.kind === 'appointment' ||
          (candidate.kind === 'task' && candidate.time_mode !== 'recurring')),
    )
    .map((candidate) => ({ value: candidate.id, label: candidate.title }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{labels.prerequisites.hint}</p>
      <ErrorBanner message={error} />
      <ul className="flex flex-col gap-2">
        {prerequisites.map((prerequisite) => {
          const dependsOn = prerequisite.depends_on_item_id;
          return (
            <li key={prerequisite.id} className="flex items-center gap-3">
              {dependsOn === null ? (
                <CheckButton
                  checked={prerequisite.is_met}
                  label={labels.actions.markDone}
                  onClick={() => {
                    setMet(prerequisite.id, !prerequisite.is_met);
                  }}
                />
              ) : (
                <Icon
                  name={titles.has(dependsOn) ? 'alert' : 'check'}
                  className="size-7 text-muted"
                />
              )}
              <span className="min-w-0 flex-1 break-words">
                {dependsOn === null ? (
                  prerequisite.description
                ) : (
                  <>
                    <span className="text-muted">{labels.prerequisites.waitingFor} </span>
                    {titles.get(dependsOn) ?? labels.status.done}
                  </>
                )}
              </span>
              <IconButton
                icon="close"
                label={labels.actions.delete}
                onClick={() => {
                  remove(prerequisite.id);
                }}
              />
            </li>
          );
        })}
      </ul>
      <AddRow label={labels.fields.newCondition} onAdd={addCondition} />
      {options.length > 0 && (
        <SelectField
          label={labels.sections.dependsOnItem}
          placeholder={labels.sections.dependsOnItem}
          value=""
          options={options}
          onChange={(itemId) => {
            if (itemId !== '') {
              addDependency(itemId);
            }
          }}
        />
      )}
    </div>
  );
}
