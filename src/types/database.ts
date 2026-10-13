// Mirrors supabase/migrations (0001_initial_schema.sql to 0017_today_nudges.sql).
// Written by hand in the shape `supabase gen types typescript` produces,
// so it can be replaced by the generated file once the project is linked.

type MemberRole = 'parent' | 'child' | 'household';
type EntityKind = 'parent' | 'personal' | 'child' | 'home' | 'couple' | 'circle';
type DomainRole = 'regular' | 'shopping' | 'debts';
type ItemKind =
  | 'task'
  | 'goal'
  | 'issue'
  | 'note'
  | 'debt'
  | 'missing_item'
  | 'shopping_run'
  | 'question'
  | 'appointment';
type MeetingPlace = 'in_person' | 'phone' | 'video';
type ShoppingCategory = 'food' | 'clothing' | 'urgent' | 'planned';
type ItemTimeMode = 'scheduled' | 'recurring' | 'anytime' | 'waiting' | 'someday';
type ItemStatus = 'open' | 'done';
type DebtDirection = 'we_owe' | 'owed_to_us';

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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
