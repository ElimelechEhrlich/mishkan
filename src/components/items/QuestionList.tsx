import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Item, ItemUpdate } from '../../types/domain';
import { AddRow } from '../ui/AddRow';
import { QuestionRow } from './QuestionRow';

type QuestionListProps = {
  /** The questions of one issue. */
  readonly questions: readonly Item[];
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  readonly onAdd: (title: string) => void;
};

export function QuestionList({ questions, onUpdate, onAdd }: QuestionListProps): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {questions.length === 0 && <p className="text-sm text-muted">{labels.questions.none}</p>}
      <ul className="flex flex-col divide-y divide-line">
        {questions.map((question) => (
          <QuestionRow key={question.id} question={question} onUpdate={onUpdate} />
        ))}
      </ul>
      <AddRow label={labels.questions.newQuestion} onAdd={onAdd} />
    </div>
  );
}
