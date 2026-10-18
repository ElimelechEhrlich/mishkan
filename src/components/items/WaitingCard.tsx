import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { WaitingOnYou } from '../../lib/todayBrief';
import type { Item } from '../../types/domain';
import { Card } from '../ui/Card';
import { WaitingRow } from './WaitingRow';

type WaitingCardProps = {
  readonly waiting: WaitingOnYou;
  /** Every open item, to name the issue of a question. */
  readonly items: readonly Item[];
  /** Items still missing a domain or a time. */
  readonly incompleteCount: number;
};

/** Questions shown at most; the rest are counted. */
const maxQuestions = 3;

/**
 * What waits on the parents rather than on a date: questions with no answer, goals that may
 * have been reached, and items to complete. Shown only when there is something.
 */
export function WaitingCard({
  waiting,
  items,
  incompleteCount,
}: WaitingCardProps): ReactElement | null {
  const { questions, reachedGoals } = waiting;
  if (questions.length === 0 && reachedGoals.length === 0 && incompleteCount === 0) {
    return null;
  }
  const titles = new Map(items.map((item) => [item.id, item.title]));
  const extra = questions.length - maxQuestions;
  return (
    <Card title={labels.today.waiting}>
      <ul className="-my-1.5 flex flex-col divide-y divide-line">
        {reachedGoals.map((goal) => (
          <WaitingRow
            key={goal.id}
            to={`/item/${goal.id}`}
            icon="target"
            title={goal.title}
            note={labels.today.reached}
          />
        ))}
        {questions.slice(0, maxQuestions).map((question) => (
          <WaitingRow
            key={question.id}
            to={`/item/${question.parent_id ?? question.id}`}
            icon="help"
            title={question.title}
            note={labels.today.questionOf(
              (question.parent_id === null ? undefined : titles.get(question.parent_id)) ?? '',
            )}
          />
        ))}
        {extra > 0 && (
          <li className="py-2 text-[13px] text-muted">{labels.today.moreQuestions(extra)}</li>
        )}
        {incompleteCount > 0 && (
          <WaitingRow
            to="/incomplete"
            icon="alert"
            title={labels.today.incomplete(incompleteCount)}
          />
        )}
      </ul>
    </Card>
  );
}
