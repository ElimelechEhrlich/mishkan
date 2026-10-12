import type { Database } from './database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Household = Tables['households']['Row'];
export type Member = Tables['members']['Row'];
export type Entity = Tables['entities']['Row'];
export type EntityUpdate = Tables['entities']['Update'];
export type EntityList = Tables['entity_lists']['Row'];
export type EntityListValue = Tables['entity_list_values']['Row'];

/** A list on an entity's profile, such as hobbies, with its values. */
export type ProfileList = EntityList & { readonly values: readonly EntityListValue[] };
export type Domain = Tables['domains']['Row'];
export type DomainUpdate = Tables['domains']['Update'];
export type Item = Tables['items']['Row'];
export type ItemUpdate = Tables['items']['Update'];
export type DebtDetails = Tables['debt_details']['Row'];
export type Prerequisite = Tables['prerequisites']['Row'];
export type Attachment = Tables['attachments']['Row'];

export type TimeMode = Enums['item_time_mode'];
export type ItemKind = Enums['item_kind'];
export type EntityKind = Enums['entity_kind'];
export type DomainRole = Enums['domain_role'];
export type DebtDirection = Enums['debt_direction'];
export type ShoppingCategory = Enums['shopping_category'];
export type MeetingPlace = Enums['meeting_place'];

export type EntityWithDomains = Entity & {
  readonly domains: readonly Domain[];
  /** A short-lived link to the entity's photo, when it has one. */
  readonly avatarUrl: string | null;
};

/** Entities that are added and removed by hand; the rest are created by the system. */
export type AddableEntityKind = Extract<EntityKind, 'parent' | 'child'>;

/** A parent entity that no parent has joined as yet, offered when joining a household. */
export type UnclaimedParent = {
  readonly id: string;
  readonly name: string;
};

/** What an item still lacks before it counts as fully assigned. */
export type MissingField = 'domain' | 'time';

/** Stored in `items.recurrence_rule` as an iCal RRULE (FREQ=DAILY and so on). */
export type Recurrence = 'daily' | 'weekly' | 'monthly';

/** The tabs of the open-items page. */
export type OpenSegment = 'active' | 'waiting' | 'someday';

/** Which kinds the tasks tab shows: tasks, or every kind that runs on time. */
export type KindFilter = 'task' | 'all';

/** The quick choices of when, offered when adding a task or a goal. */
export type QuickTime = 'today' | 'tomorrow' | 'anytime' | 'someday';

/** The groups inside the "active" tab. */
export type ActiveSection = 'overdue' | 'today' | 'thisWeek' | 'upcoming' | 'undated';

export type TimeChoice = {
  readonly time_mode: TimeMode;
  readonly due_date: string | null;
  readonly recurrence_rule: string | null;
};

/** Kinds that quick add can create. Debts and missing items have their own forms. */
export type CapturableKind = Extract<ItemKind, 'task' | 'goal' | 'issue' | 'note'>;

export type NewItem = {
  readonly title: string;
  readonly kind: CapturableKind;
  readonly domainId: string | null;
  readonly parentId: string | null;
  /** When it is due; null leaves it for "needs completion". */
  readonly time: TimeChoice | null;
};

/** Kinds an item can be converted to and from; runs and questions are left out. */
export type ConvertibleKind = Extract<
  ItemKind,
  'task' | 'goal' | 'issue' | 'note' | 'debt' | 'missing_item'
>;

/** Kinds the add sheet makes: the convertible ones and appointments, which keep their kind. */
export type AddableKind = ConvertibleKind | 'appointment';

export type DebtInput = {
  readonly counterparty: string;
  readonly amount: number;
  readonly direction: DebtDirection;
};

export type Conversion = {
  readonly kind: ConvertibleKind;
  /** For a goal or issue that stops being one: make its steps standalone instead of hiding them. */
  readonly detachSteps: boolean;
  /** For a new missing item. */
  readonly category: ShoppingCategory | null;
  /** For a new debt that never had details. */
  readonly debt: DebtInput | null;
};

/** How often a series of appointments repeats; 'none' makes one appointment. */
export type AppointmentRepeat = 'none' | 'weekly' | 'biweekly' | 'monthly';

export type NewAppointment = {
  readonly title: string;
  readonly domainId: string | null;
  /** The first one, as a local date and time (YYYY-MM-DDTHH:mm). */
  readonly startsAt: string;
  readonly repeat: AppointmentRepeat;
  /** How many appointments in all, the first included. */
  readonly count: number;
  readonly placeKind: MeetingPlace | null;
  /** An address in person, a phone number by phone. */
  readonly place: string | null;
  readonly meetingUrl: string | null;
  readonly withWhom: string | null;
};

export type NewDebt = {
  readonly counterparty: string;
  readonly amount: number;
  readonly direction: DebtDirection;
  readonly domainId: string | null;
};

export type NewMissingItem = {
  readonly title: string;
  readonly category: ShoppingCategory;
  /** The shopping domain of the chosen entity. */
  readonly domainId: string;
};

/** An entity and its shopping domain, for choosing whom a missing item is for. */
export type ShoppingTarget = {
  readonly entity: EntityWithDomains;
  readonly domainId: string;
};

/** A shopping run with every missing item in it, bought ones included. */
export type ShoppingRun = {
  readonly run: Item;
  readonly items: readonly Item[];
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
  /** The parents who have joined, for showing who completed an item. */
  readonly members: readonly Member[];
  /** The entity every tab is narrowed to, or null for everything. */
  readonly scopeId: string | null;
  readonly setScope: (entityId: string | null) => void;
  /** The domain name, such as בריאות, the time tabs are narrowed to, or null for all. */
  readonly topic: string | null;
  readonly setTopic: (topic: string | null) => void;
  /** How the main page arranges what is open: by kind, or by domain. */
  readonly homeView: HomeView;
  readonly setHomeView: (view: HomeView) => void;
};

/** The two arrangements of the main page. */
export type HomeView = 'kind' | 'domain';
