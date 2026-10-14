// Mirrors supabase/migrations (0001_initial_schema.sql to 0032_reliability_fixes.sql).
// Written by hand in the shape `supabase gen types typescript` produces,
// so it can be replaced by the generated file once the project is linked.

type MemberRole = 'parent' | 'child' | 'household';
type EntityKind = 'parent' | 'personal' | 'child' | 'home' | 'couple' | 'circle';
type DomainRole = 'regular' | 'shopping' | 'debts';
/** How a tracker sums up its entries: the total, the latest, or not at all. */
export type TrackerSummary = 'sum' | 'latest' | 'none';

type ItemKind =
  | 'task'
  | 'goal'
  | 'issue'
  | 'note'
  | 'debt'
  | 'missing_item'
  | 'shopping_run'
  | 'question'
  | 'tracker'
  | 'appointment';
type MeetingPlace = 'in_person' | 'phone' | 'video';
type ShoppingCategory = 'food' | 'clothing' | 'urgent' | 'planned';
type ItemTimeMode = 'scheduled' | 'recurring' | 'urgent' | 'anytime' | 'waiting' | 'someday';
type ItemStatus = 'open' | 'done';
type DebtDirection = 'we_owe' | 'owed_to_us';
/** A set time, a time before the item's hour, a day before at an hour, or again and again. */
export type ReminderRule = 'at' | 'before' | 'day' | 'repeat';
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
export type RepeatEnd = 'never' | 'count' | 'until';
export type RepeatFrom = 'schedule' | 'completion';
export type OccurrenceStatus = 'done' | 'skipped' | 'missed' | 'closed_with_parent';

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          auto_remind_member_ids: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          color: string | null;
          role: MemberRole;
          user_id: string | null;
          /** When the parent was last nudged to complete what waits for them. */
          completion_nudged_at: string | null;
          /** When the parent was last sent the morning look at today. */
          today_nudged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          color?: string | null;
          role: MemberRole;
          user_id?: string | null;
          completion_nudged_at?: string | null;
          today_nudged_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          color?: string | null;
          role?: MemberRole;
          user_id?: string | null;
          completion_nudged_at?: string | null;
          today_nudged_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      entities: {
        Row: {
          id: string;
          household_id: string;
          kind: EntityKind;
          name: string;
          member_id: string | null;
          sort_order: number;
          /** Where a child stands among the children once moved by hand; null orders by age. */
          position: number | null;
          id_number: string | null;
          birth_date: string | null;
          born_after_sunset: boolean;
          notes: string | null;
          wedding_date: string | null;
          wedding_after_sunset: boolean;
          avatar_emoji: string | null;
          avatar_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          kind: EntityKind;
          name: string;
          member_id?: string | null;
          sort_order?: number;
          position?: number | null;
          id_number?: string | null;
          birth_date?: string | null;
          born_after_sunset?: boolean;
          notes?: string | null;
          wedding_date?: string | null;
          wedding_after_sunset?: boolean;
          avatar_emoji?: string | null;
          avatar_path?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
          position?: number | null;
          id_number?: string | null;
          birth_date?: string | null;
          born_after_sunset?: boolean;
          notes?: string | null;
          wedding_date?: string | null;
          wedding_after_sunset?: boolean;
          avatar_emoji?: string | null;
          avatar_path?: string | null;
        };
        Relationships: [];
      };
      domains: {
        Row: {
          id: string;
          household_id: string;
          entity_id: string;
          name: string;
          icon: string | null;
          sort_order: number;
          role: DomainRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          entity_id: string;
          name: string;
          icon?: string | null;
          sort_order?: number;
          role?: DomainRole;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          notes: string | null;
          kind: ItemKind;
          domain_id: string | null;
          parent_id: string | null;
          time_mode: ItemTimeMode | null;
          due_date: string | null;
          /** An optional hour on the due date (HH:MM:SS), for a task. */
          due_time: string | null;
          remind_at: string | null;
          recurrence_rule: string | null;
          status: ItemStatus;
          created_by: string;
          completed_by: string | null;
          review_by: string | null;
          previous_domain_label: string | null;
          shopping_category: ShoppingCategory | null;
          run_id: string | null;
          hidden: boolean;
          answer: string | null;
          auto_key: string | null;
          reminder_sent_at: string | null;
          remind_member_ids: string[] | null;
          starts_at: string | null;
          place_kind: MeetingPlace | null;
          place: string | null;
          meeting_url: string | null;
          with_whom: string | null;
          series_id: string | null;
          in_main: boolean;
          /** A note that is one value: its title is the name and its answer the value. */
          is_value: boolean;
          /** The item's entity: its domain's, or the one chosen while it has no domain yet. */
          entity_id: string | null;
          /** A tracker's unit, such as ₪ or kg, shown beside its values. */
          tracker_unit: string | null;
          /** How a tracker sums up its entries. */
          tracker_summary: TrackerSummary;
          created_at: string;
          completed_at: string | null;
          is_complete: boolean;
        };
        Insert: {
          id?: string;
          household_id?: string;
          title: string;
          notes?: string | null;
          kind?: ItemKind;
          domain_id?: string | null;
          parent_id?: string | null;
          time_mode?: ItemTimeMode | null;
          due_date?: string | null;
          due_time?: string | null;
          remind_at?: string | null;
          recurrence_rule?: string | null;
          status?: ItemStatus;
          created_by?: string;
          review_by?: string | null;
          previous_domain_label?: string | null;
          shopping_category?: ShoppingCategory | null;
          run_id?: string | null;
          hidden?: boolean;
          answer?: string | null;
          auto_key?: string | null;
          starts_at?: string | null;
          place_kind?: MeetingPlace | null;
          place?: string | null;
          meeting_url?: string | null;
          with_whom?: string | null;
          series_id?: string | null;
          in_main?: boolean;
          is_value?: boolean;
          entity_id?: string | null;
          tracker_unit?: string | null;
          tracker_summary?: TrackerSummary;
          completed_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        // The kind is changed only through convert_item().
        Update: {
          title?: string;
          notes?: string | null;
          domain_id?: string | null;
          parent_id?: string | null;
          time_mode?: ItemTimeMode | null;
          due_date?: string | null;
          due_time?: string | null;
          remind_at?: string | null;
          remind_member_ids?: string[] | null;
          recurrence_rule?: string | null;
          status?: ItemStatus;
          shopping_category?: ShoppingCategory | null;
          run_id?: string | null;
          answer?: string | null;
          starts_at?: string | null;
          place_kind?: MeetingPlace | null;
          place?: string | null;
          meeting_url?: string | null;
          with_whom?: string | null;
          in_main?: boolean;
          is_value?: boolean;
          entity_id?: string | null;
          tracker_unit?: string | null;
          tracker_summary?: TrackerSummary;
        };
        Relationships: [];
      };
      entity_lists: {
        Row: {
          id: string;
          household_id: string;
          entity_id: string;
          title: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          entity_id: string;
          title: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      tracker_entries: {
        Row: {
          id: string;
          item_id: string;
          on_date: string;
          value: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          on_date?: string;
          value: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          on_date?: string;
          value?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      item_data: {
        Row: {
          id: string;
          item_id: string;
          /** The name of a value; null for a line of text. */
          label: string | null;
          value: string;
          /** Where the row stands among the item's rows. */
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          label?: string | null;
          value?: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          label?: string | null;
          value?: string;
          position?: number;
        };
        Relationships: [];
      };
      item_reminders: {
        Row: {
          id: string;
          item_id: string;
          rule: ReminderRule;
          at: string | null;
          minutes_before: number | null;
          days_before: number | null;
          at_time: string | null;
          every: number | null;
          unit: RepeatUnit | null;
          until: string | null;
          member_ids: string[] | null;
          /** Kept by the server: the next ring; null when waiting for a date or hour, or done. */
          due_at: string | null;
          sent_for: string | null;
          sent_at: string | null;
          legacy: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          rule: ReminderRule;
          at?: string | null;
          minutes_before?: number | null;
          days_before?: number | null;
          at_time?: string | null;
          every?: number | null;
          unit?: RepeatUnit | null;
          until?: string | null;
          member_ids?: string[] | null;
        };
        Update: {
          rule?: ReminderRule;
          at?: string | null;
          minutes_before?: number | null;
          days_before?: number | null;
          at_time?: string | null;
          every?: number | null;
          unit?: RepeatUnit | null;
          until?: string | null;
          member_ids?: string[] | null;
        };
        Relationships: [];
      };
      reminder_snoozes: {
        Row: {
          item_id: string;
          member_id: string;
          remind_at: string;
          created_at: string;
        };
        Insert: {
          item_id: string;
          member_id: string;
          remind_at: string;
          created_at?: string;
        };
        Update: {
          remind_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          household_id: string;
          member_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        // Written only through save_push_subscription().
        Insert: never;
        Update: never;
        Relationships: [];
      };
      entity_list_values: {
        Row: {
          id: string;
          list_id: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          value: string;
          created_at?: string;
        };
        Update: {
          value?: string;
        };
        Relationships: [];
      };
      debt_details: {
        Row: {
          item_id: string;
          amount: number;
          counterparty: string;
          direction: DebtDirection;
        };
        Insert: {
          item_id: string;
          amount: number;
          counterparty: string;
          direction: DebtDirection;
        };
        Update: {
          amount?: number;
          counterparty?: string;
          direction?: DebtDirection;
        };
        Relationships: [];
      };
      prerequisites: {
        Row: {
          id: string;
          item_id: string;
          depends_on_item_id: string | null;
          description: string | null;
          is_met: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          depends_on_item_id?: string | null;
          description?: string | null;
          is_met?: boolean;
          created_at?: string;
        };
        Update: {
          depends_on_item_id?: string | null;
          description?: string | null;
          is_met?: boolean;
        };
        Relationships: [];
      };
      item_repeats: {
        Row: {
          item_id: string;
          every: number;
          unit: RepeatUnit;
          /** The first occurrence; the rhythm counts from it. */
          starts_on: string;
          at_time: string | null;
          end_kind: RepeatEnd;
          end_count: number | null;
          end_until: string | null;
          /** Set by "stop repeating": no occurrence after this day. */
          stopped_on: string | null;
          missed_from: string;
          updated_at: string;
          /** The hours of each day (HH:MM:SS), earliest first; empty for the whole day. */
          times: string[];
          /** For a weekly rhythm: the days of the week (0 = Sunday); empty for the first day's. */
          weekdays: number[];
          /** 'completion': the next occurrence counts from when the current one was marked. */
          from_kind: RepeatFrom;
          /** Where the current occurrence was planned, while it is moved. */
          planned_date: string | null;
          planned_time: string | null;
          /** A tracker: entering a value marks its current occurrence done. */
          tracker_closes: boolean;
          /** Days given in full (a Hebrew date's years ahead); when set, they are the days. */
          dates: string[];
          /** The days are those of a Hebrew date, every year. */
          hebrew: boolean;
        };
        // Written only through set_repeat(), stop_repeat() and resume_repeat().
        Insert: never;
        Update: never;
        Relationships: [];
      };
      occurrences: {
        Row: {
          id: string;
          item_id: string;
          on_date: string;
          at_time: string | null;
          status: OccurrenceStatus;
          done_by: string | null;
          done_at: string;
        };
        // Written only through mark_occurrence() and unmark_occurrence().
        Insert: never;
        Update: never;
        Relationships: [];
      };
      completions: {
        Row: {
          id: string;
          item_id: string;
          completed_by: string | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          completed_by?: string | null;
          completed_at?: string;
        };
        Update: {
          completed_by?: string | null;
          completed_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          item_id: string;
          storage_path: string;
          file_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          storage_path: string;
          file_name: string;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          file_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_repeat: {
        Args: {
          p_item_id: string;
          p_every: number;
          p_unit: RepeatUnit;
          p_starts_on: string;
          p_at_time: string | null;
          p_end_kind: RepeatEnd;
          p_end_count: number | null;
          p_end_until: string | null;
        };
        Returns: undefined;
      };
      save_repeat: {
        Args: {
          p_item_id: string;
          p_every: number;
          p_unit: RepeatUnit;
          p_starts_on: string;
          p_times: string[];
          p_weekdays: number[];
          p_from_kind: RepeatFrom;
          p_end_kind: RepeatEnd;
          p_end_count: number | null;
          p_end_until: string | null;
          p_tracker_closes: boolean;
        };
        Returns: undefined;
      };
      sync_occasion: {
        Args: { p_prefix: string; p_title: string; p_domain_id: string | null; p_dates: string[] };
        Returns: undefined;
      };
      move_occurrence: {
        Args: { p_item_id: string; p_date: string; p_time: string | null };
        Returns: undefined;
      };
      create_repeating_appointment: {
        Args: {
          p_title: string;
          p_domain_id: string | null;
          p_starts: string;
          p_place_kind: MeetingPlace | null;
          p_place: string | null;
          p_meeting_url: string | null;
          p_with_whom: string | null;
          p_entity_id: string | null;
          p_every: number;
          p_unit: RepeatUnit;
          p_count: number | null;
        };
        Returns: string;
      };
      stop_repeat: {
        Args: { p_item_id: string };
        Returns: undefined;
      };
      resume_repeat: {
        Args: {
          p_item_id: string;
          p_end_kind: RepeatEnd;
          p_end_count: number | null;
          p_end_until: string | null;
        };
        Returns: undefined;
      };
      mark_occurrence: {
        Args: { p_item_id: string; p_status: OccurrenceStatus };
        Returns: string;
      };
      unmark_occurrence: {
        Args: { p_occurrence_id: string };
        Returns: undefined;
      };
      close_item: {
        Args: { p_item_id: string };
        Returns: undefined;
      };
      move_item_data: {
        Args: { p_row_id: string; p_step: number };
        Returns: undefined;
      };
      create_household: {
        Args: { p_household_name: string; p_parent_name: string };
        Returns: string;
      };
      join_household: {
        Args: { p_invite_code: string; p_parent_name: string; p_parent_entity_id?: string };
        Returns: string;
      };
      unclaimed_parents: {
        Args: { p_invite_code: string };
        Returns: { id: string; name: string }[];
      };
      delete_domain: {
        Args: { p_domain_id: string };
        Returns: undefined;
      };
      delete_entity: {
        Args: { p_entity_id: string };
        Returns: undefined;
      };
      convert_item: {
        Args: {
          p_item_id: string;
          p_kind: ItemKind;
          p_detach_steps?: boolean;
          p_category?: ShoppingCategory;
          p_amount?: number;
          p_counterparty?: string;
          p_direction?: DebtDirection;
        };
        Returns: undefined;
      };
      create_appointments: {
        Args: {
          p_title: string;
          p_domain_id: string | null;
          p_starts: string[];
          p_place_kind: MeetingPlace | null;
          p_place: string | null;
          p_meeting_url: string | null;
          p_with_whom: string | null;
          p_entity_id?: string | null;
        };
        Returns: number;
      };
      set_auto_reminder_recipients: {
        Args: { p_member_ids: string[] | null };
        Returns: undefined;
      };
      members_with_push: {
        Args: Record<string, never>;
        Returns: string[];
      };
      save_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string };
        Returns: undefined;
      };
      sync_auto_reminder: {
        Args: {
          p_prefix: string;
          p_key: string;
          p_title: string;
          p_domain_id: string | null;
          p_due: string;
        };
        Returns: undefined;
      };
      create_shopping_run: {
        Args: { p_category: ShoppingCategory; p_private: boolean };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
      entity_kind: EntityKind;
      domain_role: DomainRole;
      item_kind: ItemKind;
      shopping_category: ShoppingCategory;
      item_time_mode: ItemTimeMode;
      item_status: ItemStatus;
      debt_direction: DebtDirection;
      meeting_place: MeetingPlace;
      reminder_rule: ReminderRule;
      repeat_unit: RepeatUnit;
      repeat_end: RepeatEnd;
      occurrence_status: OccurrenceStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
