export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      advisories: {
        Row: {
          created_at: string
          details: Json
          household_id: string
          id: string
          match: Json
          match_status: string
          original_captured_at: string
          original_image_path: string | null
          original_kind: string
          original_name: string
          original_text: string
          reviewed_at: string
          revision: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details: Json
          household_id: string
          id?: string
          match: Json
          match_status?: string
          original_captured_at: string
          original_image_path?: string | null
          original_kind: string
          original_name: string
          original_text?: string
          reviewed_at: string
          revision: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          household_id?: string
          id?: string
          match?: Json
          match_status?: string
          original_captured_at?: string
          original_image_path?: string | null
          original_kind?: string
          original_name?: string
          original_text?: string
          reviewed_at?: string
          revision?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_preparation: {
        Row: {
          advisory_id: string
          checked: string[]
          created_at: string
          household_id: string
          household_signature: string
          id: number
          revision: number
          signature_hash: string
          updated_at: string
        }
        Insert: {
          advisory_id: string
          checked?: string[]
          created_at?: string
          household_id: string
          household_signature: string
          id?: never
          revision: number
          signature_hash?: string
          updated_at?: string
        }
        Update: {
          advisory_id?: string
          checked?: string[]
          created_at?: string
          household_id?: string
          household_signature?: string
          id?: never
          revision?: number
          signature_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisory_preparation_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      appliances: {
        Row: {
          created_at: string
          days_in_period: number
          hours_per_day: number
          household_id: string
          id: string
          kind: string
          model: string | null
          name: string
          quantity: number
          updated_at: string
          wattage_basis: string
          watts: number
        }
        Insert: {
          created_at?: string
          days_in_period?: number
          hours_per_day: number
          household_id: string
          id?: string
          kind?: string
          model?: string | null
          name: string
          quantity?: number
          updated_at?: string
          wattage_basis?: string
          watts: number
        }
        Update: {
          created_at?: string
          days_in_period?: number
          hours_per_day?: number
          household_id?: string
          id?: string
          kind?: string
          model?: string | null
          name?: string
          quantity?: number
          updated_at?: string
          wattage_basis?: string
          watts?: number
        }
        Relationships: [
          {
            foreignKeyName: "appliances_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_login_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip_hash: string
          username: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          ip_hash: string
          username: string
        }
        Update: {
          attempted_at?: string
          id?: never
          ip_hash?: string
          username?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount_centavos: number
          billing_date: string | null
          billing_month: string
          created_at: string
          due_date: string | null
          household_id: string
          id: string
          kwh: number
          notes: string | null
          period_end: string | null
          period_start: string | null
          provider_custom_name: string | null
          provider_id: string | null
          source: string
          source_name: string | null
          updated_at: string
        }
        Insert: {
          amount_centavos: number
          billing_date?: string | null
          billing_month: string
          created_at?: string
          due_date?: string | null
          household_id: string
          id?: string
          kwh: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          provider_custom_name?: string | null
          provider_id?: string | null
          source: string
          source_name?: string | null
          updated_at?: string
        }
        Update: {
          amount_centavos?: number
          billing_date?: string | null
          billing_month?: string
          created_at?: string
          due_date?: string | null
          household_id?: string
          id?: string
          kwh?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          provider_custom_name?: string | null
          provider_id?: string | null
          source?: string
          source_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      brownout_plans: {
        Row: {
          acknowledged_updates: Json
          advisory_id: string
          advisory_snapshot: Json
          checked: string[]
          created_at: string
          household_id: string
          relevance_confirmed: boolean
          snapshot_image_path: string | null
          source_confirmed: boolean
          updated_at: string
        }
        Insert: {
          acknowledged_updates?: Json
          advisory_id: string
          advisory_snapshot: Json
          checked?: string[]
          created_at?: string
          household_id: string
          relevance_confirmed: boolean
          snapshot_image_path?: string | null
          source_confirmed: boolean
          updated_at?: string
        }
        Update: {
          acknowledged_updates?: Json
          advisory_id?: string
          advisory_snapshot?: Json
          checked?: string[]
          created_at?: string
          household_id?: string
          relevance_confirmed?: boolean
          snapshot_image_path?: string | null
          source_confirmed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brownout_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          barangay: string | null
          created_at: string
          id: string
          location: string | null
          monthly_budget_centavos: number | null
          municipality: string | null
          name: string | null
          owner_id: string
          provider_custom_name: string | null
          provider_id: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          barangay?: string | null
          created_at?: string
          id?: string
          location?: string | null
          monthly_budget_centavos?: number | null
          municipality?: string | null
          name?: string | null
          owner_id: string
          provider_custom_name?: string | null
          provider_id?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          barangay?: string | null
          created_at?: string
          id?: string
          location?: string | null
          monthly_budget_centavos?: number | null
          municipality?: string | null
          name?: string | null
          owner_id?: string
          provider_custom_name?: string | null
          provider_id?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          id: string
          notify_bill_reminders: boolean
          notify_brownouts: boolean
          notify_tips: boolean
          onboarded_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id: string
          notify_bill_reminders?: boolean
          notify_brownouts?: boolean
          notify_tips?: boolean
          onboarded_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id?: string
          notify_bill_reminders?: boolean
          notify_brownouts?: boolean
          notify_tips?: boolean
          onboarded_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          area: string
          created_at: string
          detail: string
          id: string
          is_coverage_verified: boolean
          name: string
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          detail?: string
          id: string
          is_coverage_verified?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          detail?: string
          id?: string
          is_coverage_verified?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          created_at: string
          household_id: string
          id: string
          payload: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          payload: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          payload?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_progress: {
        Row: {
          acknowledged: string | null
          created_at: string
          household_id: string
          reviewed_tips: string | null
          updated_at: string
        }
        Insert: {
          acknowledged?: string | null
          created_at?: string
          household_id: string
          reviewed_tips?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged?: string | null
          created_at?: string
          household_id?: string
          reviewed_tips?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_progress_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tips_snapshots: {
        Row: {
          created_at: string
          generated_at: string
          household_id: string
          input_signature: string
          snapshot: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at: string
          household_id: string
          input_signature: string
          snapshot: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          household_id?: string
          input_signature?: string
          snapshot?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advisory_original_count: { Args: never; Returns: number }
      is_unique_subset: {
        Args: { allowed: string[]; items: string[] }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
