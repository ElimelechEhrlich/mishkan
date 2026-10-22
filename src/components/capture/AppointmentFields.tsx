import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { appointmentRepeats, maxAppointments, withDay } from '../../lib/itemRules';
import type { AppointmentRepeat, MeetingPlace } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { Segmented } from '../ui/Segmented';
import { HebrewDateToggle } from '../ui/HebrewDateToggle';
import { TextField } from '../ui/TextField';
import { PlaceFields } from './PlaceFields';

/** What the add sheet holds for a new appointment while it is being filled in. */
export type AppointmentDraft = {
  /** The first one, as a datetime-local value; required. */
  readonly startsAt: string;
  readonly placeKind: MeetingPlace | null;
  readonly place: string;
  readonly meetingUrl: string;
  readonly withWhom: string;
  readonly repeat: AppointmentRepeat;
  readonly count: string;
};

export const emptyAppointmentDraft: AppointmentDraft = {
  startsAt: '',
  placeKind: null,
  place: '',
  meetingUrl: '',
  withWhom: '',
  repeat: 'none',
  count: '4',
};

type AppointmentFieldsProps = {
  readonly draft: AppointmentDraft;
  readonly onChange: (changes: Partial<AppointmentDraft>) => void;
  /** Whether the chosen domain is about health, so common doctors are offered. */
  readonly health: boolean;
};

const repeatOptions = appointmentRepeats.map((value) => ({
  value,
  label: labels.appointmentRepeat[value],
}));

/** When, where, with whom, and how often: the parts of a new appointment besides its title. */
export function AppointmentFields({
  draft,
  onChange,
  health,
}: AppointmentFieldsProps): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <TextField
          label={labels.appointment.when}
          type="datetime-local"
          direction="ltr"
          value={draft.startsAt}
          onChange={(startsAt) => {
            onChange({ startsAt });
          }}
        />
        <HebrewDateToggle
          value={draft.startsAt.slice(0, 10)}
          onPick={(day) => {
            onChange({ startsAt: withDay(draft.startsAt, day) });
          }}
        />
        <p className="px-0.5 text-[13px] text-muted">{labels.appointment.reminderHint}</p>
      </div>

      <PlaceFields
        placeKind={draft.placeKind}
        place={draft.place}
        meetingUrl={draft.meetingUrl}
        onChange={onChange}
      />

      <div className="flex flex-col gap-2">
        <TextField
          label={labels.appointment.withWhom}
          value={draft.withWhom}
          onChange={(withWhom) => {
            onChange({ withWhom });
          }}
        />
        {health && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
            {labels.appointment.doctors.map((doctor) => (
              <Chip
                key={doctor}
                label={doctor}
                selected={draft.withWhom === doctor}
                onClick={() => {
                  onChange({ withWhom: draft.withWhom === doctor ? '' : doctor });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-wide text-muted">
          {labels.appointment.repeat}
        </span>
        <Segmented
          options={repeatOptions}
          value={draft.repeat}
          onChange={(repeat) => {
            onChange({ repeat });
          }}
        />
        {draft.repeat !== 'none' && (
          <>
            <TextField
              label={`${labels.appointment.count} (${String(maxAppointments)} ${labels.appointment.atMost})`}
              type="number"
              direction="ltr"
              value={draft.count}
              onChange={(count) => {
                onChange({ count });
              }}
            />
            <p className="px-0.5 text-[13px] text-muted">{labels.appointment.seriesHint}</p>
          </>
        )}
      </div>
    </div>
  );
}
