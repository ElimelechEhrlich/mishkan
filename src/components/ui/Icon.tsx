import type { ReactElement } from 'react';

const paths = {
  list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
  target: [
    'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
    'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z',
    'M12 12h.01',
  ],
  wallet: [
    'M4 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z',
    'M4 8V6.5A2.5 2.5 0 0 1 6.5 4H16',
    'M16 14h.01',
  ],
  alert: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', 'M12 8v5', 'M12 16.5h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  clock: ['M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 0 0 0-17z', 'M12 7.5V12l3 2'],
  settings: [
    'M4 7h9',
    'M19 7h1',
    'M4 17h1',
    'M11 17h9',
    'M16 5a2 2 0 1 0 0 4a2 2 0 0 0 0-4z',
    'M8 15a2 2 0 1 0 0 4a2 2 0 0 0 0-4z',
  ],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  done: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', 'M8 12.5l2.8 2.8L16 9.5'],
  back: ['M9 6l6 6-6 6'],
  forward: ['M15 6l-6 6 6 6'],
  trash: ['M5 7h14', 'M10 7V5h4v2', 'M7 7l1 12h8l1-12'],
  clip: ['M8 12.5l5.5-5.5a2.5 2.5 0 0 1 3.5 3.5l-7 7a4 4 0 0 1-5.7-5.7l6.2-6.2'],
  repeat: ['M5 11a7 7 0 0 1 12-4l2 2', 'M19 5v4h-4', 'M19 13a7 7 0 0 1-12 4l-2-2', 'M5 19v-4h4'],
  lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M6 11h12v9H6z'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  down: ['M6 9l6 6 6-6'],
  up: ['M6 15l6-6 6 6'],
  arrowUp: ['M12 19V5', 'M6.5 10.5L12 5l5.5 5.5'],
  arrowDown: ['M12 5v14', 'M6.5 13.5L12 19l5.5-5.5'],
  inbox: [
    'M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z',
    'M4 13h4.5a3.5 3.5 0 0 0 7 0H20',
  ],
  edit: ['M4 20h4l10-10-4-4L4 16v4z', 'M13 7l4 4'],
  note: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 12h7', 'M9 16h5'],
  user: ['M12 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  userPlus: [
    'M10 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8z',
    'M3 20a7 7 0 0 1 11.5-5.4',
    'M18 14v6',
    'M15 17h6',
  ],
  share: ['M12 15V4', 'M8 8l4-4 4 4', 'M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5'],
  copy: ['M9 9h10v11H9z', 'M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4'],
  logout: ['M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4', 'M14 8l-4 4 4 4', 'M10 12h10'],
  cake: [
    'M4 20h16',
    'M5 20v-7h14v7',
    'M5 16.5c2.3 1.3 4.7 1.3 7 0s4.7-1.3 7 0',
    'M12 13V9.5',
    'M12 7c-.9-.9-.9-2 0-3c.9 1 .9 2.1 0 3z',
  ],
  search: ['M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13z', 'M15.5 15.5L20 20'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  download: ['M12 4v11', 'M7.5 10.5L12 15l4.5-4.5', 'M5 19h14'],
  help: [
    'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
    'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7',
    'M12 17h.01',
  ],
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'],
  home: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'],
  users: [
    'M9 4.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z',
    'M2.5 19.5a6.5 6.5 0 0 1 13 0',
    'M16 4.8a3.3 3.3 0 0 1 0 6.4',
    'M18 13.6a6 6 0 0 1 3.5 5.9',
  ],
  heart: [
    'M12 20s-7.5-4.6-7.5-10a4.3 4.3 0 0 1 7.5-2.9A4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  ],
  calendar: ['M5 6h14v14H5z', 'M5 10h14', 'M9 4v4', 'M15 4v4', 'M9 14h2', 'M13 14h2', 'M9 17h2'],
  pin: [
    'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z',
    'M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z',
  ],
  phone: [
    'M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2z',
  ],
  video: ['M4 7h11v10H4z', 'M15 10.5l5-3v9l-5-3'],
  chart: ['M4 19h16', 'M5 15l4-4 3 3 7-7', 'M15 7h4v4'],
  cart: [
    'M3 4h2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2',
    'M9 20h.01',
    'M17 20h.01',
  ],
} as const;

export type IconName = keyof typeof paths;

type IconProps = {
  readonly name: IconName;
  readonly className?: string;
};

export function Icon({ name, className = 'size-5' }: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
