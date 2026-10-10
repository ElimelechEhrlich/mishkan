// Mirrors supabase/migrations/0001_initial_schema.sql.
// Written by hand in the shape `supabase gen types typescript` produces,
// so it can be replaced by the generated file once the project is linked.

type MemberRole = 'parent' | 'child' | 'household';
type DomainVisibility = 'household' | 'private';
type ItemKind = 'task' | 'goal' | 'issue' | 'note' | 'debt';
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
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          color?: string | null;
          role: MemberRole;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          color?: string | null;
          role?: MemberRole;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      areas: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          icon: string | null;
          sort_order: number;
          visibility: DomainVisibility;
          owner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          icon?: string | null;
          sort_order?: number;
          visibility?: DomainVisibility;
          owner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          icon?: string | null;
          sort_order?: number;
          visibility?: DomainVisibility;
          owner_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      domains: {
        Row: {
          id: string;
          household_id: string;
          area_id: string;
          name: string;
          icon: string | null;
          sort_order: number;
          visibility: DomainVisibility;
          owner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          area_id: string;
          name: string;
          icon?: string | null;
          sort_order?: number;
          visibility?: DomainVisibility;
          owner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          area_id?: string;
          name?: string;
          icon?: string | null;
          sort_order?: number;
          visibility?: DomainVisibility;
          owner_id?: string | null;
          created_at?: string;
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
          member_id: string | null;
          parent_id: string | null;
          time_mode: ItemTimeMode | null;
          due_date: string | null;
          remind_at: string | null;
          recurrence_rule: string | null;
          status: ItemStatus;
          created_by: string;
          completed_by: string | null;
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
          member_id?: string | null;
          parent_id?: string | null;
          time_mode?: ItemTimeMode | null;
          due_date?: string | null;
          remind_at?: string | null;
          recurrence_rule?: string | null;
          status?: ItemStatus;
          created_by?: string;
          completed_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          title?: string;
          notes?: string | null;
          kind?: ItemKind;
          domain_id?: string | null;
          member_id?: string | null;
          parent_id?: string | null;
          time_mode?: ItemTimeMode | null;
          due_date?: string | null;
          remind_at?: string | null;
          recurrence_rule?: string | null;
          status?: ItemStatus;
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
        Args: { p_invite_code: string; p_parent_name: string };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
      domain_visibility: DomainVisibility;
      item_kind: ItemKind;
      item_time_mode: ItemTimeMode;
      item_status: ItemStatus;
      debt_direction: DebtDirection;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
