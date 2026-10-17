import { useState } from 'react';
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
 * One quiet row under the entity pictures: a small menu that narrows the tabs to a topic
 * ("all domains" until one is chosen; with "everything" above it gathers that topic from
 * every entity), and beside it the page's own switch. Without topics to choose between, only
 * the switch.
 */
export function TopicBar({ topics, value, onChange, children }: TopicBarProps): ReactElement {
  const [open, setOpen] = useState(false);
  const choices: readonly (string | null)[] = [null, ...topics];

  function choose(topic: string | null): void {
    setOpen(false);
    onChange(topic);
  }

  return (
    <div className="flex items-center gap-2">
      {topics.length >= 2 && (
        <div className="relative max-w-[45%] shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={labels.topic.label}
            onClick={() => {
              setOpen(!open);
            }}
            className={`flex min-h-8 w-full items-center gap-1 rounded-full border ps-3 pe-2 text-xs font-semibold transition active:scale-[0.97] ${
              value === null
                ? 'border-line bg-surface text-ink'
                : 'border-primary bg-primary text-white'
            }`}
          >
            <span className="truncate">{value ?? labels.topic.all}</span>
            <Icon
              name="down"
              className={`size-3.5 shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
          {open && (
            <>
              {/* A tap anywhere else closes the menu. */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                }}
                className="fixed inset-0 z-30 cursor-default"
              />
              <ul
                role="listbox"
                aria-label={labels.topic.label}
                className="absolute start-0 top-full z-40 mt-1.5 flex max-h-72 w-max min-w-full animate-fade-in flex-col overflow-y-auto rounded-2xl bg-surface p-1 shadow-raised"
              >
                {choices.map((topic) => {
                  const selected = topic === value;
                  return (
                    <li key={topic ?? ''}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          choose(topic);
                        }}
                        className={`flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-start text-[13px] active:bg-paper ${
                          selected ? 'font-semibold text-primary' : 'text-ink'
                        }`}
                      >
                        <span className="flex-1 whitespace-nowrap">
                          {topic ?? labels.topic.all}
                        </span>
                        {selected && <Icon name="check" className="size-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
      {children !== undefined && <div className="min-w-0 flex-1">{children}</div>}
    </div>
  );
}
