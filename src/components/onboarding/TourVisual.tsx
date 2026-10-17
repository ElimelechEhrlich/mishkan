import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { CalendarBadge } from '../items/CalendarBadge';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

/** The pages of the tour, by name; their words are in labels.tour.pages. */
export type TourStep = keyof typeof labels.tour.pages;

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
  'target',
  'alert',
  'calendar',
  'note',
  'chart',
  'cart',
  'wallet',
];

/** A card the size of the tour's pictures, drawn like a card of the app. */
const cardClass = 'flex w-72 flex-col rounded-2xl bg-surface text-start shadow-card';

const purposeIcons: readonly IconName[] = ['plus', 'grid', 'calendar'];

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
    case 'begin':
      return <img src="/icons/icon.svg" alt="" className="size-24 rounded-[28px] shadow-raised" />;
    case 'purpose':
      return (
        <div className="flex gap-3">
          {labels.tour.purposeSample.map((word, index) => (
            <span
              key={word}
              className="flex w-24 flex-col items-center gap-2 rounded-2xl bg-surface py-3 text-sm font-semibold shadow-card"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={purposeIcons[index] ?? 'plus'} className="size-5.5" />
              </span>
              {word}
            </span>
          ))}
        </div>
      );
    case 'time':
      return (
        <div className="flex max-w-80 flex-wrap justify-center gap-2">
          {labels.tour.timeSample.map((word, index) => (
            <span
              key={word}
              className={`rounded-full px-3.5 py-1.5 text-[15px] font-medium ${
                index === 0 ? 'bg-primary text-white' : 'bg-surface text-ink shadow-card'
              }`}
            >
              {word}
            </span>
          ))}
        </div>
      );
    case 'home':
      return (
        <div className="flex w-72 flex-col gap-2.5">
          <div className="flex gap-0.5 rounded-xl bg-line/80 p-0.5 text-[13px]">
            <span className="flex-1 rounded-[10px] bg-surface py-1.5 font-semibold shadow-raised">
              {labels.homeView.kind}
            </span>
            <span className="flex-1 py-1.5 text-muted">{labels.homeView.domain}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {labels.tour.homeTiles.map((tile, index) => (
              <span
                key={tile}
                className="flex items-baseline justify-center gap-1 rounded-xl bg-surface px-1.5 py-1.5 shadow-card"
              >
                <span
                  className={`font-display text-lg leading-6 font-bold ${index < 2 ? 'text-alert' : ''}`}
                >
                  {String(index + 1)}
                </span>
                <span className="text-xs text-muted">{tile}</span>
              </span>
            ))}
          </div>
        </div>
      );
    case 'today':
      return (
        <div className="flex w-72 flex-col gap-2.5">
          <span className="relative flex size-12 items-center justify-center self-center rounded-2xl bg-surface text-muted shadow-card">
            <Icon name="calendar" className="size-6" />
            <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-paper bg-alert px-1 text-[11px] font-bold text-white">
              {String(labels.tour.todayGroups.reduce((sum, group) => sum + group.rows.length, 0))}
            </span>
          </span>
          <span className={cardClass}>
            {labels.tour.todayGroups.map((group, index) => (
              <span
                key={group.label}
                className="flex flex-col border-t border-line first:border-t-0"
              >
                <span
                  className={`px-3.5 pt-2 text-[11px] font-bold ${index < 2 ? 'text-alert' : 'text-muted'}`}
                >
                  {group.label}
                </span>
                {group.rows.map((row) => (
                  <span
                    key={row.title}
                    className="flex items-center justify-between gap-2 px-3.5 py-1.5"
                  >
                    <span className="text-[14px] font-medium">{row.title}</span>
                    <span
                      className={`text-xs font-semibold ${index < 2 ? 'text-alert' : 'text-primary'}`}
                    >
                      {row.when}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </span>
        </div>
      );
    case 'goals':
      return (
        <div className={`${cardClass} gap-2 p-3.5`}>
          <span className="flex items-center gap-2">
            <Icon name="target" className="size-5 text-primary" />
            <span className="flex-1 text-[15px] font-semibold">{labels.tour.goalSample}</span>
            <span className="text-xs font-semibold text-muted">{labels.tour.goalBy}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <span className="block h-full w-1/3 rounded-full bg-primary" />
            </span>
            <span className="text-[11px] font-semibold text-muted">{labels.tour.goalProgress}</span>
          </span>
          {labels.tour.goalSteps.map((row) => (
            <span key={row.title} className="flex items-center gap-2 text-sm">
              <span className="size-4 rounded-full border-2 border-primary/60" />
              <span className="flex-1">{row.title}</span>
              <span className="text-xs font-semibold text-muted">{row.when}</span>
            </span>
          ))}
        </div>
      );
    case 'issues':
      return (
        <div className={`${cardClass} gap-2.5 p-3.5`}>
          <span className="flex items-center gap-2">
            <Icon name="alert" className="size-5 text-primary" />
            <span className="text-[15px] font-semibold">{labels.tour.issueSample}</span>
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {labels.tour.issueParts.map((part) => (
              <span
                key={part}
                className="rounded-xl bg-primary-soft px-3 py-1.5 text-center text-[13px] font-semibold text-primary"
              >
                {part}
              </span>
            ))}
          </div>
        </div>
      );
    case 'notes':
      return (
        <div className="flex w-72 flex-col gap-2.5">
          <span className={`${cardClass} flex-row items-center gap-3 px-3.5 py-2.5`}>
            <span className="flex flex-1 flex-col">
              <span className="text-[13px] text-muted">{labels.tour.valueSample.name}</span>
              <span className="text-lg font-bold">{labels.tour.valueSample.value}</span>
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-paper text-muted">
              <Icon name="copy" className="size-4.5" />
            </span>
          </span>
          <span className={`${cardClass} gap-1 px-3.5 py-2.5`}>
            <span className="text-[15px] font-semibold">{labels.tour.recipeSample}</span>
            {labels.tour.recipeLines.map((line) => (
              <span key={line} className="text-[13px] text-muted">
                {line}
              </span>
            ))}
          </span>
        </div>
      );
    case 'trackers':
      return (
        <div className={`${cardClass} gap-1.5 p-3.5`}>
          <span className="flex items-center gap-2">
            <Icon name="chart" className="size-5 text-primary" />
            <span className="flex-1 text-[15px] font-semibold">{labels.tour.trackerSample}</span>
          </span>
          <span className="font-display text-2xl font-bold">{labels.tour.trackerTotal}</span>
          {labels.tour.trackerEntries.map((entry) => (
            <span
              key={entry.when}
              className="flex justify-between border-t border-line pt-1.5 text-[13px]"
            >
              <span className="text-muted">{entry.when}</span>
              <span className="font-semibold">{entry.value}</span>
            </span>
          ))}
        </div>
      );
    case 'appointments':
      return (
        <div className="flex w-72 flex-col gap-1 rounded-2xl bg-surface p-3.5 text-start shadow-card">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold">{labels.tour.appointmentSample}</span>
            <span className="text-xs font-semibold text-primary">
              {labels.tour.appointmentWhen}
            </span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Icon name="pin" className="size-3.5" />
            {labels.tour.appointmentPlace}
          </span>
        </div>
      );
    case 'circle':
      return (
        <div className="flex items-center gap-3">
          <span className="flex size-20 items-center justify-center rounded-full border-4 border-surface bg-entity-2 text-white shadow-card">
            <Icon name="users" className="size-9" />
          </span>
          <div className="flex flex-col gap-1.5">
            {labels.tour.circleSample.map((name) => (
              <span
                key={name}
                className="rounded-full bg-surface px-3.5 py-1.5 text-[14px] font-medium shadow-card"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );
    case 'shopping':
      return (
        <div className={`${cardClass} overflow-hidden`}>
          <span className="px-3.5 pt-3 pb-2 text-[15px] font-semibold">
            {labels.tour.runSample.title}
          </span>
          {labels.tour.runSample.departments.map((department) => {
            const done = department.items.length === 0;
            return (
              <div key={department.name} className="flex flex-col">
                <span
                  className={`flex items-center gap-1.5 border-t border-line px-3.5 py-1 ${
                    done ? 'bg-primary-soft/60' : 'bg-paper'
                  }`}
                >
                  {done && <Icon name="check" className="size-3 text-primary" />}
                  <span className={`text-[11px] font-bold ${done ? 'text-primary' : 'text-muted'}`}>
                    {department.name}
                  </span>
                  <span className="text-[10px] text-faint">{department.count}</span>
                  <Icon
                    name="down"
                    className={`ms-auto size-3 text-faint ${done ? '' : 'rotate-180'}`}
                  />
                </span>
                {department.items.map((row) => (
                  <span
                    key={row.title}
                    className="flex items-center gap-2.5 border-t border-line px-3.5 py-2 text-sm"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded-full ${
                        row.bought ? 'bg-primary text-white' : 'border-2 border-faint'
                      }`}
                    >
                      {row.bought && <Icon name="check" className="size-3" />}
                    </span>
                    <span className={row.bought ? 'text-muted line-through' : 'font-medium'}>
                      {row.title}
                    </span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      );
    case 'debts':
      return (
        <div className={`${cardClass} overflow-hidden`}>
          <span className="flex items-center gap-2 px-3.5 py-2.5">
            <Icon name="wallet" className="size-5 text-primary" />
            <span className="text-[13px] font-semibold text-primary">
              {labels.tour.debtSample.total}
            </span>
          </span>
          {labels.tour.debtSample.rows.map((row) => (
            <span
              key={row.name}
              className="flex items-center gap-2 border-t border-line px-3.5 py-2.5"
            >
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-medium">{row.name}</span>
                <span className="text-xs text-muted">{row.direction}</span>
              </span>
              <span
                className={`text-[15px] font-semibold ${row.ours ? 'text-alert' : 'text-primary'}`}
              >
                {row.amount}
              </span>
            </span>
          ))}
        </div>
      );
    case 'more':
      return (
        <div className="flex gap-2 rounded-2xl bg-surface p-2 shadow-card">
          {(['search', 'done', 'settings'] as const).map((icon) => (
            <span
              key={icon}
              className="flex size-14 items-center justify-center rounded-xl text-muted"
            >
              <Icon name={icon} className="size-7" />
            </span>
          ))}
        </div>
      );
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
    case 'assistant':
      return (
        <div className="flex w-72 flex-col gap-2">
          <span className="self-end rounded-2xl rounded-ee-md bg-primary px-3.5 py-2 text-[14px] text-white">
            {labels.tour.chatSample.ask}
          </span>
          <span className="flex flex-col self-start rounded-2xl rounded-es-md bg-surface px-3.5 py-2 text-[14px] leading-relaxed shadow-card">
            {labels.tour.chatSample.reply.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </div>
      );
    case 'calendar':
      return (
        <div className={`${cardClass} gap-3 p-3.5`}>
          <span className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-medium">{labels.tour.calendarSample.title}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <CalendarBadge itemId="" always />
              {labels.tour.calendarSample.time}
            </span>
          </span>
          <span className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="text-[14px]">{labels.calendar.row}</span>
            <span className="relative h-6 w-10 rounded-full bg-primary">
              <span className="absolute start-[1.125rem] top-0.5 size-5 rounded-full bg-surface shadow-card" />
            </span>
          </span>
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
