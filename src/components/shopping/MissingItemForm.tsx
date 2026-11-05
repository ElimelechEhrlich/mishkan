import { useState } from 'react';
import { Link } from 'react-router';
import type { ReactElement, SyntheticEvent } from 'react';
import { labels } from '../../constants/labels';
import { splitQuantity } from '../../lib/quantity';
import { shoppingLines } from '../../lib/shoppingLines';
import { likelyMeant, pairKey } from '../../lib/stapleSimilarity';
import type {
  NewMissingItem,
  ShoppingCategory,
  ShoppingStaple,
  ShoppingTarget,
} from '../../types/domain';
import { Chip } from '../ui/Chip';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { MissingItemFields } from './MissingItemFields';
import { ShoppingListField } from './ShoppingListField';

type MissingItemFormProps = {
  /** Entities and their shopping domains, the home first. */
  readonly targets: readonly ShoppingTarget[];
  readonly onAdd: (newItem: NewMissingItem) => Promise<boolean>;
  /** The fixed list, to ask "הכוונה ל...?" when a name is likely one of it written otherwise. */
  readonly known: readonly ShoppingStaple[];
  /** Pairs of names marked not the same product, by `pairKey`. */
  readonly apart: ReadonlySet<string>;
  /** A name was said not to be the one on the fixed list: not asked again. */
  readonly onApart: (pairKey: string) => void;
};

/**
 * What is missing, of which kind, and for whom (the home unless changed). Folded to one line,
 * with "+" and the way to the standing list beside it, so the shopping list shows right under
 * it; the kind and for whom open once something is written. The list is written as a message, a
 * line per item, and added in one tap; the kind and the entity stay chosen for the next list.
 */
export function MissingItemForm({
  targets,
  onAdd,
  known,
  apart,
  onApart,
}: MissingItemFormProps): ReactElement {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [chosenDomainId, setChosenDomainId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // For each line likely meaning a name of the fixed list: that name, and the answer so far
  // (true: it is that one; false: it is the line as written).
  const [asking, setAsking] = useState<
    ReadonlyMap<number, { meant: string; same: boolean | null }>
  >(new Map());

  const domainId = chosenDomainId ?? targets[0]?.domainId ?? null;
  const titles = shoppingLines(text);
  const lines = titles.map(splitQuantity);

  function send(answers: ReadonlyMap<number, { meant: string; same: boolean | null }>): void {
    if (domainId === null) {
      return;
    }
    setSaving(true);
    setAsking(new Map());
    void onAdd({
      titles: lines.map((line, index) =>
        answers.get(index)?.same === true ? (answers.get(index)?.meant ?? line.name) : line.name,
      ),
      quantities: lines.map((line) => line.quantity),
      category,
      domainId,
    }).then((saved) => {
      setSaving(false);
      if (saved) {
        setText('');
      }
    });
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (titles.length === 0 || domainId === null || saving) {
      return;
    }
    // Only the "סופר" list has a fixed list to compare with.
    const questions = new Map<number, { meant: string; same: boolean | null }>();
    if (category === 'food') {
      lines.forEach((line, index) => {
        const meant = likelyMeant(line.name, known, apart);
        if (meant !== null) {
          questions.set(index, { meant: meant.title, same: null });
        }
      });
    }
    if (questions.size === 0) {
      send(questions);
    } else {
      setAsking(questions);
    }
  }

  function answer(index: number, same: boolean): void {
    const question = asking.get(index);
    const line = lines[index];
    if (question === undefined || line === undefined) {
      return;
    }
    if (!same) {
      onApart(pairKey(line.name, question.meant));
    }
    const next = new Map(asking).set(index, { ...question, same });
    if ([...next.values()].every((entry) => entry.same !== null)) {
      send(next);
    } else {
      setAsking(next);
    }
  }

  const open = text.trim() !== '';

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ShoppingListField value={text} onChange={setText} folded />
          </div>
          {open ? (
            <button
              type="submit"
              aria-label={labels.shopping.addCount(titles.length)}
              disabled={domainId === null || saving}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-card transition active:scale-95 disabled:opacity-50"
            >
              <Icon name="plus" className="size-6" />
            </button>
          ) : (
            <Link
              to="/shopping/staples"
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-primary-soft px-3 text-[13px] font-semibold text-primary transition active:scale-[0.97]"
            >
              <Icon name="list" className="size-4.5" />
              {labels.staples.short}
            </Link>
          )}
        </div>
        {open && (
          <>
            <MissingItemFields
              category={category}
              onCategoryChange={setCategory}
              targets={targets}
              domainId={domainId}
              onDomainChange={setChosenDomainId}
            />
            {titles.length > 1 && (
              <p className="text-[13px] text-muted">{labels.shopping.addCount(titles.length)}</p>
            )}
            {[...asking.entries()]
              .filter(([, question]) => question.same === null)
              .map(([index, question]) => {
                const name = lines[index]?.name ?? '';
                return (
                  <div key={index} className="flex flex-col gap-1.5 rounded-xl bg-paper p-2.5">
                    <p className="text-[14px] font-medium">
                      {labels.shopping.meant(question.meant)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip
                        label={labels.shopping.meantYes(question.meant)}
                        selected={false}
                        onClick={() => {
                          answer(index, true);
                        }}
                      />
                      <Chip
                        label={labels.shopping.meantNo(name)}
                        selected={false}
                        outline
                        onClick={() => {
                          answer(index, false);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </form>
    </Card>
  );
}
