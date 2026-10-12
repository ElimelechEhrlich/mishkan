import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Chip } from '../ui/Chip';

type TopicBarProps = {
  /** The domain names that can be chosen, such as בריאות and חינוך. */
  readonly topics: readonly string[];
  /** The chosen one, or null for all of them. */
  readonly value: string | null;
  readonly onChange: (topic: string | null) => void;
};

/**
 * One quiet row under the entity pictures that narrows the tabs to a topic: with
 * "everything" chosen above it gathers that topic from every entity. Tapping the chosen
 * topic again lets it go. Hidden when there is nothing to choose between.
 */
export function TopicBar({ topics, value, onChange }: TopicBarProps): ReactElement | null {
  if (topics.length < 2) {
    return null;
  }
  return (
    <div
      role="group"
      aria-label={labels.topic.label}
      className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none]"
    >
      <div className="mx-auto flex w-max gap-1.5">
        <Chip
          label={labels.topic.all}
          selected={value === null}
          onClick={() => {
            onChange(null);
          }}
        />
        {topics.map((topic) => (
          <Chip
            key={topic}
            label={topic}
            selected={topic === value}
            onClick={() => {
              onChange(topic === value ? null : topic);
            }}
          />
        ))}
      </div>
    </div>
  );
}
