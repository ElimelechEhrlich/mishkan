import { useState } from "react";
import type { ReactElement } from "react";
import { labels } from "../../constants/labels";
import { useEntityProfile } from "../../hooks/useEntityProfile";
import { formatFullDate } from "../../lib/itemRules";
import { occasionSummary } from "../../lib/occasions";
import type { EntityWithDomains } from "../../types/domain";
import { AddRow } from "../ui/AddRow";
import { ErrorBanner } from "../ui/ErrorBanner";
import { Icon } from "../ui/Icon";
import { PropertyRow } from "../ui/PropertyRow";
import { DateRow } from "./DateRow";
import { ProfileListBlock } from "./ProfileListBlock";
import { ProfileNotes } from "./ProfileNotes";
import { TextPropertyRow } from "./TextPropertyRow";

type EntityProfileCardProps = {
  readonly entity: EntityWithDomains;
  /** Reloads the entity, and its items, after its fields are saved. */
  readonly onEntityChanged: () => Promise<void>;
};

type OpenRow = "date" | "idNumber" | null;

const noop = (): void => undefined;

/**
 * The profile at the top of a child's, parent's or the couple's page. Folded, it shows
 * the age (or years married) and when the Hebrew date comes; unfolded, the details,
 * a child's lists and notes.
 */
export function EntityProfileCard({
  entity,
  onEntityChanged,
}: EntityProfileCardProps): ReactElement {
  const profile = useEntityProfile(entity, onEntityChanged);
  const [expanded, setExpanded] = useState(false);
  const [openRow, setOpenRow] = useState<OpenRow>(null);
  const { occasion, facts } = profile;
  const isCouple = entity.kind === "couple";
  const isChild = entity.kind === "child";
  const date = isCouple ? entity.wedding_date : entity.birth_date;
  const afterSunset = isCouple
    ? entity.wedding_after_sunset
    : entity.born_after_sunset;

  function toggle(row: Exclude<OpenRow, null>): void {
    setOpenRow(openRow === row ? null : row);
  }

  return (
    <>
      <ErrorBanner message={profile.error} />
      <section className="overflow-hidden rounded-2xl bg-surface shadow-card">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(!expanded);
          }}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-start active:bg-paper"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
            <Icon name="cake" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-base font-semibold">
              {labels.profile.title}
            </span>
            <span className="truncate text-xs text-muted">
              {occasion === null || facts === null
                ? labels.profile.addDateHint
                : occasionSummary(occasion, facts)}
            </span>
          </span>
          <Icon
            name="down"
            className={`size-4 text-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="flex animate-fade-in flex-col divide-y divide-line border-t border-line px-3.5">
            <DateRow
              label={
                isCouple ? labels.profile.weddingDate : labels.profile.birthDate
              }
              date={date}
              afterSunset={afterSunset}
              display={date === null ? "" : formatFullDate(date)}
              open={openRow === "date"}
              onToggle={() => {
                toggle("date");
              }}
              onSave={(newDate, newAfterSunset) => {
                setOpenRow(null);
                profile.update(
                  isCouple
                    ? {
                        wedding_date: newDate,
                        wedding_after_sunset: newAfterSunset,
                      }
                    : {
                        birth_date: newDate,
                        born_after_sunset: newAfterSunset,
                      },
                );
              }}
            />
            {facts !== null && (
              <>
                <PropertyRow
                  label={labels.profile.hebrewDate}
                  value={facts.hebrewDate}
                  open={false}
                  onToggle={noop}
                />
                <PropertyRow
                  label={
                    isCouple ? labels.profile.yearsMarried : labels.profile.age
                  }
                  value={`${String(facts.years)} ${labels.profile.years}`}
                  open={false}
                  onToggle={noop}
                />
              </>
            )}
            {isChild && (
              <TextPropertyRow
                label={labels.profile.idNumber}
                value={entity.id_number}
                direction="ltr"
                open={openRow === "idNumber"}
                onToggle={() => {
                  toggle("idNumber");
                }}
                onSave={(idNumber) => {
                  setOpenRow(null);
                  profile.update({ id_number: idNumber });
                }}
              />
            )}
            {isChild &&
              profile.lists.map((list) => (
                <ProfileListBlock
                  key={list.id}
                  list={list}
                  onAddValue={profile.addValue}
                  onRemoveValue={profile.removeValue}
                  onRemoveList={profile.removeList}
                />
              ))}
            {isChild && (
              <div className="py-3">
                <AddRow
                  label={labels.profile.newList}
                  onAdd={profile.addList}
                />
              </div>
            )}
            {isChild && (
              <ProfileNotes
                notes={entity.notes}
                onSave={(notes) => {
                  profile.update({ notes });
                }}
              />
            )}
          </div>
        )}
      </section>
    </>
  );
}
