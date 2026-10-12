import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

export type TourStep =
  | 'welcome'
  | 'kinds'
  | 'arenas'
  | 'domains'
  | 'profile'
  | 'add'
  | 'incomplete'
  | 'tabs'
  | 'notify';

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

const kindIcons: readonly IconName[] = [
  'list',
  'calendar',
  'target',
  'alert',
  'note',
  'cart',
  'wallet',
];

const tabs: readonly { readonly icon: IconName; readonly label: string }[] = [
  { icon: 'home', label: labels.nav.home },
  { icon: 'list', label: labels.nav.open },
  { icon: 'calendar', label: labels.nav.appointments },
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
    case 'kinds':
      return (
        <ul className="flex w-full max-w-80 flex-col overflow-hidden rounded-2xl bg-surface text-start shadow-card">
          {labels.tour.kindsSample.map((line, index) => {
            const [name, text] = line.split(': ');
            return (
              <li
                key={line}
                className="flex items-center gap-3 border-t border-line px-3.5 py-2 first:border-t-0"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
                  <Icon name={kindIcons[index] ?? 'list'} className="size-4.5" />
                </span>
                <span className="text-sm leading-5">
                  <span className="font-semibold">{name}</span>
                  {text === undefined ? '' : ` · ${text}`}
                </span>
              </li>
            );
          })}
        </ul>
      );
    case 'domains':
      return (
        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface py-1.5 ps-1.5 pe-4 text-[17px] font-semibold shadow-card">
            <span className="flex size-8 items-center justify-center rounded-full bg-entity-6 font-display font-bold text-white">
              {labels.tour.domainsEntity.charAt(0)}
            </span>
            {labels.tour.domainsEntity}
          </span>
          <span className="h-4 w-px bg-faint" />
          <div className="flex flex-wrap justify-center gap-2">
            {labels.tour.domainsSample.map((name) => (
              <span
                key={name}
                className="rounded-full bg-primary-soft px-3.5 py-1.5 text-[15px] font-medium text-primary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );
    case 'arenas':
      return (
        <div className="relative h-28 w-72">
          {labels.tour.arenasSample.slice(0, 5).map((name, index) => {
            const distance = index - 2;
            const away = Math.abs(distance);
            const offset = away === 0 ? 0 : away === 1 ? 74 : 124;
            return (
              <span
                key={name}
                className={`absolute top-1/2 left-1/2 flex items-center justify-center rounded-full border-4 border-surface font-display font-bold text-white shadow-card ${entityColors[index] ?? ''}`}
                style={{
                  width: away === 0 ? 96 : away === 1 ? 62 : 42,
                  height: away === 0 ? 96 : away === 1 ? 62 : 42,
                  fontSize: away === 0 ? 40 : away === 1 ? 24 : 16,
                  transform: `translate(calc(-50% + ${String(-Math.sign(distance) * offset)}px), -50%)`,
                  opacity: away === 0 ? 1 : away === 1 ? 0.85 : 0.4,
                  zIndex: 10 - away,
                }}
              >
                {name.charAt(0)}
              </span>
            );
          })}
        </div>
      );
    case 'profile':
      return (
        <div className="flex w-72 flex-col items-center gap-2 rounded-3xl bg-surface p-4 shadow-card">
          <span className="flex size-20 items-center justify-center rounded-full bg-cream text-5xl">
            👧
          </span>
          <span className="font-display text-lg font-bold">{labels.tour.profileName}</span>
          <span className="text-[13px] text-muted">{labels.tour.profileFacts}</span>
          <div className="flex gap-1.5">
            {labels.tour.profileChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-primary-soft px-3 py-1 text-[13px] font-medium text-primary"
              >
                {chip}
              </span>
            ))}
          </div>
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
        <div className="grid w-full max-w-80 grid-cols-7 rounded-2xl bg-surface py-2 shadow-card">
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
