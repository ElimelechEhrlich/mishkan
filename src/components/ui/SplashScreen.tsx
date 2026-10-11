import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';

const tiles = [
  { x: 140, y: 268, color: 'var(--color-entity-1)' },
  { x: 225, y: 268, color: 'var(--color-entity-2)' },
  { x: 310, y: 268, color: 'var(--color-entity-3)' },
  { x: 140, y: 352, color: 'var(--color-entity-4)' },
  { x: 225, y: 352, color: 'var(--color-primary)' },
  { x: 310, y: 352, color: 'var(--color-entity-5)' },
] as const;

/**
 * The full-screen loading picture: the logo draws itself. It matches the splash in
 * index.html, so the hand-over from the page to the app is not seen.
 */
export function SplashScreen(): ReactElement {
  return (
    <div
      role="status"
      aria-label={labels.status.loading}
      className="fixed inset-0 flex items-center justify-center bg-paper"
    >
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        className="size-28 rounded-[30px] shadow-float"
      >
        <rect width="512" height="512" fill="var(--color-cream)" />
        <path
          className="splash-roof"
          d="M80 236 L256 96 L432 236"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="40"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {tiles.map((tile, index) => (
          <rect
            key={`${String(tile.x)}-${String(tile.y)}`}
            className="splash-tile"
            style={{
              animationDelay: `${String(0.55 + index * 0.1)}s, ${String(1.4 + index * 0.1)}s`,
            }}
            x={tile.x}
            y={tile.y}
            width="62"
            height="62"
            rx="14"
            fill={tile.color}
          />
        ))}
      </svg>
    </div>
  );
}
