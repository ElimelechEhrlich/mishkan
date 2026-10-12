import { labels } from '../constants/labels';
import type { EntityWithDomains } from '../types/domain';
import {
  ageInYears,
  daysBetween,
  formatHebrewDate,
  hebrewBirthDate,
  nextHebrewBirthday,
} from './hebrewDate';
import { addDays, formatDueDate } from './itemRules';

/** How long before a Hebrew birthday or anniversary its reminder is due. */
const daysBefore = 7;

/** A yearly date of an entity, kept by its Hebrew date. */
export type Occasion = {
  readonly kind: 'birthday' | 'anniversary';
  /** The Gregorian date it happened on. */
  readonly date: string;
  readonly afterSunset: boolean;
};

/** The birthday of a child or parent, or the wedding day of the couple, when it is set. */
export function occasionOf(entity: EntityWithDomains): Occasion | null {
  if ((entity.kind === 'child' || entity.kind === 'parent') && entity.birth_date !== null) {
    return { kind: 'birthday', date: entity.birth_date, afterSunset: entity.born_after_sunset };
  }
  if (entity.kind === 'couple' && entity.wedding_date !== null) {
    return {
      kind: 'anniversary',
      date: entity.wedding_date,
      afterSunset: entity.wedding_after_sunset,
    };
  }
  return null;
}

/** The Hebrew date of the occasion, such as ט״ו בתשרי תשע״ז. */
export function occasionHebrewDate(occasion: Occasion, withYear: boolean): string {
  return formatHebrewDate(hebrewBirthDate(occasion.date, occasion.afterSunset), withYear);
}

/** What a profile shows about an occasion. */
export type OccasionFacts = {
  /** Age, or years married. */
  readonly years: number;
  /** With the year: ט״ו בתשרי תשע״ז. */
  readonly hebrewDate: string;
  /** Days to the next Hebrew date; 0 is today. */
  readonly daysUntil: number | null;
};

export function occasionFacts(occasion: Occasion, today: string): OccasionFacts {
  const next = nextHebrewBirthday(occasion.date, occasion.afterSunset, today);
  return {
    years: ageInYears(occasion.date, today),
    hebrewDate: occasionHebrewDate(occasion, true),
    daysUntil: next === null ? null : daysBetween(today, next),
  };
}

export type OccasionReminder = {
  readonly prefix: string;
  readonly key: string;
  readonly title: string;
  /** The entity's events domain; null without one, so it waits for completion. */
  readonly domainId: string | null;
  readonly due: string;
};

/**
 * The entity's events domain (a name with אירוע in it). Nothing else is chosen in its place: without one the reminder
 * has no domain and waits in "needs completion" for a parent to place it.
 */
function reminderDomain(entity: EntityWithDomains): string | null {
  return (
    entity.domains.find(
      (domain) => domain.role === 'regular' && domain.name.includes(labels.occasions.eventsDomain),
    )?.id ?? null
  );
}

/**
 * The reminder for the next Hebrew birthday or anniversary of each entity that has one:
 * a task a week before (or today, if that is already past), one per year, in the entity's
 * events domain.
 */
export function occasionReminders(
  entities: readonly EntityWithDomains[],
  today: string,
): OccasionReminder[] {
  return entities.flatMap((entity) => {
    const occasion = occasionOf(entity);
    const domainId = reminderDomain(entity);
    if (occasion === null) {
      return [];
    }
    const next = nextHebrewBirthday(occasion.date, occasion.afterSunset, today);
    if (next === null) {
      return [];
    }
    const before = addDays(next, -daysBefore);
    const due = before < today ? today : before;
    const prefix = `${occasion.kind}:${entity.id}:`;
    const name =
      occasion.kind === 'birthday'
        ? `${labels.occasions.birthdayOf} ${entity.name}`
        : labels.occasions.anniversaryTitle;
    // Read on the day it is due: "in a week", or how near it is when added later.
    const gap = daysBetween(due, next);
    const when = gap === daysBefore ? labels.occasions.inAWeek : countdownText(gap);
    const date = `${occasionHebrewDate(occasion, false)} (${formatDueDate(next)})`;
    return [
      {
        prefix,
        key: `${prefix}${next}`,
        title: `${when}: ${name}${labels.item.separator}${date}`,
        domainId,
        due,
      },
    ];
  });
}

/** When the next Hebrew date comes: today, tomorrow, or in so many days. */
export function countdownText(daysUntil: number): string {
  if (daysUntil === 0) {
    return labels.profile.today;
  }
  if (daysUntil === 1) {
    return labels.profile.tomorrow;
  }
  return `${labels.profile.inDays} ${String(daysUntil)} ${labels.profile.days}`;
}

/** One line for a folded profile: age or years married, and when the Hebrew date comes. */
export function occasionSummary(occasion: Occasion, facts: OccasionFacts): string {
  const years =
    occasion.kind === 'birthday'
      ? `${labels.profile.age} ${String(facts.years)}`
      : `${String(facts.years)} ${labels.profile.yearsMarried}`;
  if (facts.daysUntil === null) {
    return years;
  }
  const name =
    occasion.kind === 'birthday' ? labels.profile.hebrewBirthday : labels.profile.hebrewAnniversary;
  return `${years}${labels.item.separator}${name} ${countdownText(facts.daysUntil)}`;
}
