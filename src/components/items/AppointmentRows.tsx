import { useState } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import {
  formatClock,
  formatFullDate,
  fromLocalDateTime,
  toLocalDateTime,
  withDay,
} from '../../lib/itemRules';
import type { Item, ItemUpdate, MeetingPlace } from '../../types/domain';
import { PlaceFields } from '../capture/PlaceFields';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { PropertyRow } from '../ui/PropertyRow';
import { HebrewDateToggle } from '../ui/HebrewDateToggle';
import { TextField } from '../ui/TextField';

type AppointmentRowsProps = {
  readonly item: Item;
  /** Whether its domain is about health, so common doctors are offered. */
  readonly health: boolean;
  readonly onUpdate: (changes: ItemUpdate) => void;
};

type Row = 'when' | 'where' | 'withWhom';

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function placeText(item: Item): string {
  if (item.place_kind === null) {
    return labels.appointment.noPlace;
  }
  const detail = item.place_kind === 'video' ? null : item.place;
  return detail === null
    ? labels.meetingPlace[item.place_kind]
    : `${labels.meetingPlace[item.place_kind]}${labels.item.separator}${detail}`;
}

/** The rows of an appointment on its page: when, where and with whom, each edited in place. */
export function AppointmentRows({ item, health, onUpdate }: AppointmentRowsProps): ReactElement {
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const [startsAt, setStartsAt] = useState(
    item.starts_at === null ? '' : toLocalDateTime(item.starts_at),
  );
  const [placeKind, setPlaceKind] = useState<MeetingPlace | null>(item.place_kind);
  const [place, setPlace] = useState(item.place ?? '');
  const [meetingUrl, setMeetingUrl] = useState(item.meeting_url ?? '');
  const [withWhom, setWithWhom] = useState(item.with_whom ?? '');
  const [length, setLength] = useState(item.duration_minutes ?? 60);

  function toggle(row: Row): void {
    setOpenRow(openRow === row ? null : row);
  }

  function save(changes: ItemUpdate): void {
    onUpdate(changes);
    setOpenRow(null);
  }

  const whenText =
    item.starts_at === null || item.due_date === null
      ? labels.status.notSet
      : `${formatFullDate(item.due_date)} ${formatClock(item.starts_at)}${labels.item.separator}${labels.appointment.lengthText(item.duration_minutes ?? 60)}`;

  return (
    <>
      <PropertyRow
        label={labels.appointment.when}
        icon="clock"
        value={whenText}
        open={openRow === 'when'}
        onToggle={() => {
          toggle('when');
        }}
      >
        <div className="flex flex-col gap-3">
          <TextField
            label={labels.appointment.when}
            type="datetime-local"
            direction="ltr"
            value={startsAt}
            onChange={setStartsAt}
            compact
          />
          <HebrewDateToggle
            value={startsAt.slice(0, 10)}
            onPick={(day) => {
              setStartsAt(withDay(startsAt, day));
            }}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted">{labels.appointment.length}</span>
            <div className="flex flex-wrap gap-1.5">
              {/* A length kept from Google that is none of these shows as one more. */}
              {[...new Set([...labels.appointment.lengths, length])]
                .sort((a, b) => a - b)
                .map((minutes) => (
                  <Chip
                    key={minutes}
                    label={labels.appointment.lengthText(minutes)}
                    selected={length === minutes}
                    onClick={() => {
                      setLength(minutes);
                    }}
                  />
                ))}
            </div>
          </div>
          <Button
            disabled={startsAt === ''}
            onClick={() => {
              save({
                starts_at: fromLocalDateTime(startsAt),
                duration_minutes: length === 60 ? null : length,
              });
            }}
          >
            {labels.actions.save}
          </Button>
        </div>
      </PropertyRow>

      <PropertyRow
        label={labels.appointment.where}
        icon="pin"
        value={placeText(item)}
        open={openRow === 'where'}
        onToggle={() => {
          toggle('where');
        }}
      >
        <div className="flex flex-col gap-3">
          <PlaceFields
            placeKind={placeKind}
            place={place}
            meetingUrl={meetingUrl}
            onChange={(changes) => {
              if (changes.placeKind !== undefined) {
                setPlaceKind(changes.placeKind);
              }
              if (changes.place !== undefined) {
                setPlace(changes.place);
              }
              if (changes.meetingUrl !== undefined) {
                setMeetingUrl(changes.meetingUrl);
              }
            }}
          />
          <Button
            onClick={() => {
              save({
                place_kind: placeKind,
                place:
                  placeKind === 'in_person' || placeKind === 'phone' ? textOrNull(place) : null,
                meeting_url: placeKind === 'video' ? textOrNull(meetingUrl) : null,
              });
            }}
          >
            {labels.actions.save}
          </Button>
        </div>
      </PropertyRow>

      <PropertyRow
        label={labels.appointment.withWhom}
        icon="user"
        value={item.with_whom ?? labels.status.notSet}
        open={openRow === 'withWhom'}
        onToggle={() => {
          toggle('withWhom');
        }}
      >
        <div className="flex flex-col gap-3">
          <TextField
            label={labels.appointment.withWhom}
            value={withWhom}
            onChange={setWithWhom}
            compact
          />
          {health && (
            <div className="flex flex-wrap gap-1.5">
              {labels.appointment.doctors.map((doctor) => (
                <Chip
                  key={doctor}
                  label={doctor}
                  selected={withWhom === doctor}
                  onClick={() => {
                    setWithWhom(doctor);
                  }}
                />
              ))}
            </div>
          )}
          <Button
            onClick={() => {
              save({ with_whom: textOrNull(withWhom) });
            }}
          >
            {labels.actions.save}
          </Button>
        </div>
      </PropertyRow>
    </>
  );
}
