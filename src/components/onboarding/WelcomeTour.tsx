import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Button } from '../ui/Button';
import { TourVisual } from './TourVisual';
import type { TourStep } from './TourVisual';

type WelcomeTourProps = {
  readonly onClose: () => void;
};

const steps: readonly { readonly step: TourStep; readonly title: string; readonly text: string }[] =
  [
    { step: 'welcome', title: labels.tour.welcomeTitle, text: labels.tour.welcomeText },
    { step: 'kinds', title: labels.tour.kindsTitle, text: labels.tour.kindsText },
    { step: 'arenas', title: labels.tour.arenasTitle, text: labels.tour.arenasText },
    { step: 'domains', title: labels.tour.domainsTitle, text: labels.tour.domainsText },
    { step: 'add', title: labels.tour.addTitle, text: labels.tour.addText },
    { step: 'incomplete', title: labels.tour.incompleteTitle, text: labels.tour.incompleteText },
    { step: 'tabs', title: labels.tour.tabsTitle, text: labels.tour.tabsText },
    { step: 'notify', title: labels.tour.notifyTitle, text: labels.tour.notifyText },
  ];

/** How far a finger has to move to turn a page. */
const swipeDistance = 50;

/**
 * A few short pages that explain the app the first time it opens: one idea per page,
 * a picture drawn like the real screen, big buttons, and a swipe to move on.
 */
export function WelcomeTour({ onClose }: WelcomeTourProps): ReactElement | null {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const touchStart = useRef<number | null>(null);
  const current = steps[index];
  if (current === undefined) {
    return null;
  }
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
      aria-label={current.title}
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <div className="flex h-14 items-center justify-between">
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

        <div
          key={current.step}
          className={`flex flex-1 flex-col items-center justify-center gap-10 text-center ${
            direction === 'next' ? 'animate-entity-next' : 'animate-entity-previous'
          }`}
        >
          <div className="flex min-h-36 items-center justify-center">
            <TourVisual step={current.step} />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[28px] leading-9 font-bold">{current.title}</h2>
            <p className="text-[17px] leading-7 text-ink/75">{current.text}</p>
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-4 pb-6">
          <div className="flex justify-center gap-2" aria-hidden="true">
            {steps.map((item, dot) => (
              <span
                key={item.step}
                className={`h-2 rounded-full transition-all ${dot === index ? 'w-6 bg-primary' : 'w-2 bg-line'}`}
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
