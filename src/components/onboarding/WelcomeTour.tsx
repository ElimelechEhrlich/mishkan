import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { TourSetup } from './TourSetup';
import { TourVisual } from './TourVisual';
import type { TourStep } from './TourVisual';

type WelcomeTourProps = {
  readonly memberId: string;
  /** How many parents the home has, for the first steps on the last page. */
  readonly parents: number;
  readonly onClose: () => void;
};

type TourSection = keyof typeof labels.tour.sections;

/**
 * The pages in order, in three parts after the opening: the kinds of items first, as most
 * of the app is about them; then whose and what about (entities and domains); then the
 * ways to look at it all, the tools around them, and how to start.
 */
const pages: readonly { readonly step: TourStep; readonly section: TourSection }[] = [
  { step: 'welcome', section: 'intro' },
  { step: 'purpose', section: 'intro' },
  { step: 'kinds', section: 'items' },
  { step: 'time', section: 'items' },
  { step: 'goals', section: 'items' },
  { step: 'issues', section: 'items' },
  { step: 'appointments', section: 'items' },
  { step: 'notes', section: 'items' },
  { step: 'trackers', section: 'items' },
  { step: 'shopping', section: 'items' },
  { step: 'debts', section: 'items' },
  { step: 'add', section: 'items' },
  { step: 'incomplete', section: 'items' },
  { step: 'arenas', section: 'places' },
  { step: 'domains', section: 'places' },
  { step: 'circle', section: 'places' },
  { step: 'profile', section: 'places' },
  { step: 'start', section: 'views' },
  { step: 'today', section: 'views' },
  { step: 'home', section: 'views' },
  { step: 'tabs', section: 'views' },
  { step: 'notify', section: 'tools' },
  { step: 'assistant', section: 'tools' },
  { step: 'calendar', section: 'tools' },
  { step: 'more', section: 'tools' },
  { step: 'begin', section: 'intro' },
];

const steps = pages.map((entry) => entry.step);

/** How far a finger has to move to turn a page. */
const swipeDistance = 50;

/**
 * The tour that explains the app the first time it opens: what it is for, its building
 * blocks, and every part of it, one idea per page, with a picture drawn like the real
 * screen and a few short points. Big buttons, and a swipe to move on.
 */
export function WelcomeTour({ memberId, parents, onClose }: WelcomeTourProps): ReactElement | null {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const touchStart = useRef<number | null>(null);
  const step = steps[index];
  if (step === undefined) {
    return null;
  }
  const page = labels.tour.pages[step];
  const section = pages[index]?.section ?? 'intro';
  const last = index === steps.length - 1;

  function go(next: number): void {
    if (next < 0) {
      return;
    }
    if (next >= steps.length) {
      onClose();
      return;
    }
    setDirection(next > index ? 'next' : 'previous');
    setIndex(next);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={page.title}
      className="fixed inset-0 z-50 flex flex-col bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start === null || end === undefined) {
          return;
        }
        // Right to left reading: the next page waits on the left, so a swipe to the right shows it.
        if (end - start > swipeDistance) {
          go(index + 1);
        } else if (start - end > swipeDistance) {
          go(index - 1);
        }
      }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-6">
        <div className="flex h-14 shrink-0 items-center justify-between">
          <span className="text-sm text-muted">
            {String(index + 1)} {labels.tour.stepOf} {String(steps.length)}
          </span>
          {!last && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-2 text-[15px] font-semibold text-muted"
            >
              {labels.tour.skip}
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none]">
          <div
            key={step}
            className={`my-auto flex flex-col items-center gap-7 py-2 text-center ${
              direction === 'next' ? 'animate-entity-next' : 'animate-entity-previous'
            }`}
          >
            <div className="flex min-h-28 items-center justify-center">
              <TourVisual step={step} />
            </div>
            <div className="flex flex-col items-center gap-3">
              {section !== 'intro' && (
                <span className="rounded-full bg-primary-soft px-3 py-0.5 text-xs font-bold tracking-wide text-primary">
                  {labels.tour.sections[section]}
                </span>
              )}
              <h2 className="font-display text-[26px] leading-8 font-bold">{page.title}</h2>
              <p className="text-[16px] leading-7 text-ink/75">{page.text}</p>
            </div>
            {step === 'begin' && (
              <TourSetup memberId={memberId} parents={parents} onClose={onClose} />
            )}
            {step !== 'begin' && page.points.length > 0 && (
              <ul className="flex w-full flex-col gap-2.5 text-start">
                {page.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[15px] leading-6">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Icon name="check" className="size-3.5" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-4 pt-3 pb-5">
          <div className="flex justify-center gap-1.5" aria-hidden="true">
            {steps.map((item, dot) => (
              <span
                key={item}
                className={`h-1.5 rounded-full transition-all ${dot === index ? 'w-5 bg-primary' : 'w-1.5 bg-line'}`}
              />
            ))}
          </div>
          <Button
            onClick={() => {
              go(index + 1);
            }}
          >
            {last ? labels.tour.start : labels.tour.next}
          </Button>
          <div className="flex h-6 justify-center">
            {index > 0 && (
              <button
                type="button"
                onClick={() => {
                  go(index - 1);
                }}
                className="text-[15px] font-medium text-muted"
              >
                {labels.tour.back}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
