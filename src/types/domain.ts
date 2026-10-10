import type { Database } from './database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Household = Tables['households']['Row'];
export type Member = Tables['members']['Row'];
export type Area = Tables['areas']['Row'];
export type Domain = Tables['domains']['Row'];
export type Item = Tables['items']['Row'];
export type ItemUpdate = Tables['items']['Update'];

export type TimeMode = Enums['item_time_mode'];
export type ItemKind = Enums['item_kind'];
export type MemberRole = Enums['member_role'];

export type AreaWithDomains = Area & { readonly domains: readonly Domain[] };

/** What an item still lacks before it counts as fully assigned. */
export type MissingField = 'domain' | 'member' | 'time';

/** Time modes the interface can set today. Recurring needs a rule editor and is not offered yet. */
export type SelectableTimeMode = Exclude<TimeMode, 'recurring'>;

export type TimeChoice = {
  readonly time_mode: SelectableTimeMode;
  readonly due_date: string | null;
};

export type NewItem = {
  readonly title: string;
  readonly domainId: string | null;
  readonly memberId: string | null;
};

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
};
