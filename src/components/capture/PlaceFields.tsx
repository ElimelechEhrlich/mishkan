import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { MeetingPlace } from '../../types/domain';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

type PlaceFieldsProps = {
  readonly placeKind: MeetingPlace | null;
  readonly place: string;
  readonly meetingUrl: string;
  readonly onChange: (
    changes: Partial<{ placeKind: MeetingPlace | null; place: string; meetingUrl: string }>,
  ) => void;
};

const placeKinds = ['in_person', 'phone', 'video'] as const satisfies readonly MeetingPlace[];

/** Where an appointment happens: in person at an address, by phone, or by video with a link. */
export function PlaceFields({
  placeKind,
  place,
  meetingUrl,
  onChange,
}: PlaceFieldsProps): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold tracking-wide text-muted">{labels.appointment.where}</span>
      <div className="flex flex-wrap gap-1.5">
        {placeKinds.map((option) => (
          <Chip
            key={option}
            label={labels.meetingPlace[option]}
            selected={option === placeKind}
            onClick={() => {
              onChange({ placeKind: option === placeKind ? null : option });
            }}
          />
        ))}
      </div>
      {placeKind === 'in_person' && (
        <TextField
          label={labels.appointment.address}
          value={place}
          onChange={(value) => {
            onChange({ place: value });
          }}
        />
      )}
      {placeKind === 'phone' && (
        <TextField
          label={labels.appointment.phone}
          type="tel"
          direction="ltr"
          value={place}
          onChange={(value) => {
            onChange({ place: value });
          }}
        />
      )}
      {placeKind === 'video' && (
        <TextField
          label={labels.appointment.meetingUrl}
          type="url"
          direction="ltr"
          value={meetingUrl}
          onChange={(value) => {
            onChange({ meetingUrl: value });
          }}
        />
      )}
    </div>
  );
}
