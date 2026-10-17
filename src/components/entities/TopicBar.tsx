import type { ReactElement, ReactNode } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';

type TopicBarProps = {
  /** The domain names that can be chosen, such as בריאות and חינוך. */
  readonly topics: readonly string[];
  /** The chosen one, or null for all of them. */
  readonly value: string | null;
  readonly onChange: (topic: string | null) => void;
  /** What sits beside it in the same row: how the page arranges its list. */
  readonly children?: ReactNode;
};

/**
 * One quiet row under the entity pictures: a list that opens to narrow the tabs to a topic
 * ("all domains" until one is chosen; with "everything" above it gathers that topic from
 * every entity), and beside it the page's own switch. Without topics to choose between, only
 * the switch.
 */
export function TopicBar({ topics, value, onChange, children }: TopicBarProps): ReactElement {
  return (
    <div className="flex items-center gap-2">
      {topics.length >= 2 && (
        <label
          className={`relative flex min-h-8 max-w-[45%] shrink-0 items-center rounded-full border ps-3 pe-7 text-xs font-semibold ${
            value === null
              ? 'border-line bg-surface text-ink'
              : 'border-primary bg-primary text-white'
          }`}
        >
          <span className="truncate">{value ?? labels.topic.all}</span>
          <Icon name="down" className="pointer-events-none absolute end-2.5 size-3.5 opacity-70" />
          <select
            aria-label={labels.topic.label}
            value={value ?? ''}
            onChange={(event) => {
              onChange(event.target.value === '' ? null : event.target.value);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">{labels.topic.all}</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
      )}
      {children !== undefined && <div className="min-w-0 flex-1">{children}</div>}
    </div>
  );
}
