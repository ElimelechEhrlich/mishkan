import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Item } from '../../types/domain';
import { Icon } from '../ui/Icon';

type AppointmentActionsProps = {
  readonly item: Item;
};

const linkClass =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-soft px-4 text-[15px] font-semibold text-primary transition active:scale-[0.98]';

/** A link as typed, made safe to open: anything without http(s) is taken as a web address. */
function webHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Joining a video meeting or calling, when the appointment has a link or a number. */
export function AppointmentActions({ item }: AppointmentActionsProps): ReactElement | null {
  const url = item.place_kind === 'video' ? item.meeting_url : null;
  const phone = item.place_kind === 'phone' ? item.place : null;
  if (url === null && phone === null) {
    return null;
  }
  return (
    <div className="flex gap-2">
      {url !== null && (
        <a href={webHref(url)} target="_blank" rel="noreferrer" className={linkClass}>
          <Icon name="video" className="size-5" />
          {labels.appointment.join}
        </a>
      )}
      {phone !== null && (
        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={linkClass}>
          <Icon name="phone" className="size-5" />
          {labels.appointment.call}
        </a>
      )}
    </div>
  );
}
