import type { Database } from './database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Household = Tables['households']['Row'];
export type Member = Tables['members']['Row'];
export type Area = Tables['areas']['Row'];
export type AreaUpdate = Tables['areas']['Update'];
export type Domain = Tables['domains']['Row'];
export type DomainUpdate = Tables['domains']['Update'];
export type Item = Tables['items']['Row'];
export type ItemUpdate = Tables['items']['Update'];
export type DebtDetails = Tables['debt_details']['Row'];
export type Prerequisite = Tables['prerequisites']['Row'];
export type Attachment = Tables['attachments']['Row'];

export type TimeMode = Enums['item_time_mode'];
export type ItemKind = Enums['item_kind'];
export type MemberRole = Enums['member_role'];
export type Visibility = Enums['domain_visibility'];
export type DebtDirection = Enums['debt_direction'];

export type AreaWithDomains = Area & { readonly domains: readonly Domain[] };

/** What an item still lacks before it counts as fully assigned. */
export type MissingField = 'domain' | 'member' | 'time';

/** Stored in `items.recurrence_rule` as an iCal RRULE (FREQ=DAILY and so on). */
export type Recurrence = 'daily' | 'weekly' | 'monthly';

/** The tabs of the open-items page. */
export type OpenSegment = 'active' | 'waiting' | 'someday' | 'notes';

/** The groups inside the "active" tab. */
export type ActiveSection = 'overdue' | 'today' | 'upcoming' | 'undated';

export type TimeChoice = {
  readonly time_mode: TimeMode;
  readonly due_date: string | null;
  readonly recurrence_rule: string | null;
};

/** Kinds that quick add can create. A debt has its own form. */
export type CapturableKind = Exclude<ItemKind, 'debt'>;

export type NewItem = {
  readonly title: string;
  readonly kind: CapturableKind;
  readonly domainId: string | null;
  readonly memberId: string | null;
  readonly parentId: string | null;
};

export type NewDebt = {
  readonly counterparty: string;
  readonly amount: number;
  readonly direction: DebtDirection;
  readonly domainId: string | null;
};

export type Debt = {
  readonly item: Item;
  readonly details: DebtDetails;
};

export type AttachmentWithUrl = Attachment & { readonly url: string | null };

/** Provided by RequireAuth to every signed-in route. */
export type SessionContext = {
  readonly userId: string;
  readonly signOut: () => void;
};

/** Provided by RequireHousehold to every route inside a household. */
export type HouseholdContext = SessionContext & {
  readonly member: Member;
  readonly household: Household;
  readonly members: readonly Member[];
  readonly addChild: (name: string) => Promise<boolean>;
  readonly removeChild: (memberId: string) => void;
};
