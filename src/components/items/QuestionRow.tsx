import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import type { Item, ItemUpdate } from '../../types/domain';
import { IconButton } from '../ui/IconButton';
import { TextArea } from '../ui/TextArea';
import { Button } from '../ui/Button';

type QuestionRowProps = {
  readonly question: Item;
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  /** Leaves out the link to the question's own page, when already on it. */
  readonly standalone?: boolean;
};

/** A question of an issue and its answer, which stays as information once given. */
export function QuestionRow({
  question,
  onUpdate,
  standalone = false,
}: QuestionRowProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draft === null) {
      return;
    }
    const trimmed = draft.trim();
    onUpdate(question.id, { answer: trimmed === '' ? null : trimmed });
    setDraft(null);
  }

  return (
    <li className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center gap-2">
        {standalone ? (
          <span className="min-w-0 flex-1 font-medium break-words">{question.title}</span>
        ) : (
          <Link to={`/item/${question.id}`} className="min-w-0 flex-1 font-medium break-words">
            {question.title}
          </Link>
        )}
        {draft === null && (
          <IconButton
            icon="edit"
            label={labels.questions.answer}
            onClick={() => {
              setDraft(question.answer ?? '');
            }}
          />
        )}
      </div>
      {draft === null ? (
        <p
          className={`text-sm break-words whitespace-pre-wrap ${
            question.answer === null ? 'text-muted' : 'text-ink'
          }`}
        >
          {question.answer ?? labels.questions.noAnswer}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <TextArea label={labels.questions.answer} value={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <Button type="submit">{labels.actions.save}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(null);
              }}
            >
              {labels.actions.close}
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
