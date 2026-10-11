import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

export type TourStep = 'welcome' | 'entities' | 'add' | 'incomplete' | 'tabs' | 'notify';

type TourVisualProps = {
  readonly step: TourStep;
};

const entityColors = [
  'bg-entity-2',
  'bg-entity-3',
  'bg-entity-4',
  'bg-entity-5',
  'bg-entity-6',
  'bg-entity-1',
] as const;

const tabs: readonly { readonly icon: IconName; readonly label: string }[] = [
  { icon: 'home', label: labels.nav.home },
  { icon: 'list', label: labels.nav.open },
  { icon: 'target', label: labels.nav.goals },
  { icon: 'note', label: labels.nav.notes },
  { icon: 'cart', label: labels.nav.shopping },
  { icon: 'wallet', label: labels.nav.debts },
];

/** A small picture of the part of the app a tour step talks about, drawn like the real thing. */
export function TourVisual({ step }: TourVisualProps): ReactElement {
  switch (step) {
    case 'welcome':
      return <img src="/icons/icon.svg" alt="" className="size-28 rounded-[32px] shadow-raised" />;
    case 'entities':
      return (
        <div className="flex max-w-72 flex-wrap justify-center gap-2">
          {labels.tour.entitiesSample.map((name, index) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-full bg-surface py-1.5 ps-1.5 pe-3.5 text-[15px] font-medium shadow-card"
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full font-display text-sm font-bold text-white ${entityColors[index % entityColors.length] ?? ''}`}
              >
                {index === labels.tour.entitiesSample.length - 1 ? (
                  <Icon name="lock" className="size-3.5" />
                ) : (
                  name.charAt(0)
                )}
              </span>
              {name}
            </span>
          ))}
        </div>
      );
    case 'add':
      return (
        <div className="flex flex-col items-center gap-4">
          <span className="flex min-h-12 w-64 items-center rounded-2xl bg-surface px-4 text-[17px] shadow-card">
            {labels.tour.addSample}
          </span>
          <span className="flex size-16 items-center justify-center rounded-[20px] bg-primary text-white shadow-float">
            <Icon name="plus" className="size-8" />
          </span>
        </div>
      );
    case 'incomplete':
      return (
        <span className="relative flex size-24 items-center justify-center rounded-[28px] bg-surface text-muted shadow-card">
          <Icon name="alert" className="size-12" />
          <span className="absolute -top-2 -end-2 flex h-8 min-w-8 items-center justify-center rounded-full border-4 border-paper bg-alert px-1.5 text-sm font-bold text-white">
            3
          </span>
        </span>
      );
    case 'tabs':
      return (
        <div className="grid w-full max-w-80 grid-cols-6 rounded-2xl bg-surface py-2 shadow-card">
          {tabs.map((tab, index) => (
            <span
              key={tab.label}
              className={`flex flex-col items-center gap-1 text-[11px] ${index === 0 ? 'font-semibold text-primary' : 'text-muted'}`}
            >
              <Icon name={tab.icon} className="size-6" />
              {tab.label}
            </span>
          ))}
        </div>
      );
    case 'notify':
      return (
        <span className="flex size-24 items-center justify-center rounded-[28px] bg-primary text-white shadow-raised">
          <Icon name="bell" className="size-12" />
        </span>
      );
  }
}
