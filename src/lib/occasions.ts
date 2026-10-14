import { labels } from '../constants/labels';
import type { EntityWithDomains } from '../types/domain';
import {
  ageInYears,
  daysBetween,
  formatHebrewDate,
  hebrewBirthDate,
  nextHebrewBirthday,
} from './hebrewDate';
import { addDays } from './itemRules';

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

/** How many years ahead an occasion's days are sent; they are sent again on every sync. */
const yearsAhead = 10;

/** One Hebrew birthday or anniversary as a series repeating every Hebrew year. */
export type OccasionSeries = {
  readonly prefix: string;
  readonly title: string;
  /** The entity's events domain; null without one, so it waits for completion. */
  readonly domainId: string | null;
  /** The day of each year's occurrence: a week before the Hebrew date, from this year on. */
  readonly dates: readonly string[];
};

/**
 * The series of each entity's Hebrew birthday or anniversary: one item repeating every Hebrew
 * year, a week before its date (today, when that is already past this year).
 */
export function occasionSeries(
  entities: readonly EntityWithDomains[],
  today: string,
): OccasionSeries[] {
  return entities.flatMap((entity) => {
    const occasion = occasionOf(entity);
    if (occasion === null) {
      return [];
    }
    const dates: string[] = [];
    let from = today;
    for (let year = 0; year < yearsAhead; year += 1) {
      const next = nextHebrewBirthday(occasion.date, occasion.afterSunset, from);
      if (next === null) {
        break;
      }
      const before = addDays(next, -daysBefore);
      dates.push(before < today ? today : before);
      from = addDays(next, 1);
    }
    if (dates.length === 0) {
      return [];
    }
    const name =
      occasion.kind === 'birthday'
        ? `${labels.occasions.birthdayOf} ${entity.name}`
        : labels.occasions.anniversaryTitle;
    return [
      {
        prefix: `${occasion.kind}:${entity.id}:`,
        title: `${name}${labels.item.separator}${occasionHebrewDate(occasion, false)}`,
        domainId: reminderDomain(entity),
        dates,
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
