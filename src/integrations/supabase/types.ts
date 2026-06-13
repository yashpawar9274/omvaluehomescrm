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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_amount: number | null
          booking_date: string | null
          created_at: string
          employee_id: string | null
          flat_number: string | null
          id: string
          lead_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_amount?: number | null
          booking_date?: string | null
          created_at?: string
          employee_id?: string | null
          flat_number?: string | null
          id?: string
          lead_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_amount?: number | null
          booking_date?: string | null
          created_at?: string
          employee_id?: string | null
          flat_number?: string | null
          id?: string
          lead_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          lead_id: string | null
          next_call_date: string | null
          next_visit_date: string | null
          notes: string | null
          status: Database["public"]["Enums"]["followup_status"]
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          lead_id?: string | null
          next_call_date?: string | null
          next_visit_date?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          lead_id?: string | null
          next_call_date?: string | null
          next_visit_date?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          email: string | null
          id: string
          mobile: string
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          email?: string | null
          id?: string
          mobile: string
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          email?: string | null
          id?: string
          mobile?: string
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          designation: string | null
          email: string | null
          id: string
          joining_date: string | null
          mobile: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          designation?: string | null
          email?: string | null
          id: string
          joining_date?: string | null
          mobile?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          mobile?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          customer_name: string
          employee_id: string | null
          flat_number: string | null
          flat_type: Database["public"]["Enums"]["flat_type"] | null
          floor_number: string | null
          id: string
          interest_level: Database["public"]["Enums"]["interest_level"] | null
          lead_id: string | null
          mobile: string
          project_name: string | null
          remarks: string | null
          tower_name: string | null
          visit_date: string
          visit_time: string | null
          wing: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          customer_name: string
          employee_id?: string | null
          flat_number?: string | null
          flat_type?: Database["public"]["Enums"]["flat_type"] | null
          floor_number?: string | null
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          lead_id?: string | null
          mobile: string
          project_name?: string | null
          remarks?: string | null
          tower_name?: string | null
          visit_date: string
          visit_time?: string | null
          wing?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          customer_name?: string
          employee_id?: string | null
          flat_number?: string | null
          flat_type?: Database["public"]["Enums"]["flat_type"] | null
          floor_number?: string | null
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"] | null
          lead_id?: string | null
          mobile?: string
          project_name?: string | null
          remarks?: string | null
          tower_name?: string | null
          visit_date?: string
          visit_time?: string | null
          wing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "employee"
        | "manager"
        | "sales"
        | "super_receptionist"
      booking_status: "interested" | "token_paid" | "confirmed" | "registered"
      flat_type: "1bhk" | "2bhk" | "3bhk" | "shop" | "office"
      followup_status: "pending" | "completed" | "missed" | "overdue"
      interest_level: "hot" | "warm" | "cold"
      lead_source:
        | "facebook_ads"
        | "google_ads"
        | "website"
        | "walk_in"
        | "reference"
        | "whatsapp"
        | "property_portal"
      lead_status:
        | "new"
        | "contacted"
        | "visit_scheduled"
        | "visit_done"
        | "follow_up"
        | "booking"
        | "lost"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee", "manager", "sales", "super_receptionist"],
      booking_status: ["interested", "token_paid", "confirmed", "registered"],
      flat_type: ["1bhk", "2bhk", "3bhk", "shop", "office"],
      followup_status: ["pending", "completed", "missed", "overdue"],
      interest_level: ["hot", "warm", "cold"],
      lead_source: [
        "facebook_ads",
        "google_ads",
        "website",
        "walk_in",
        "reference",
        "whatsapp",
        "property_portal",
      ],
      lead_status: [
        "new",
        "contacted",
        "visit_scheduled",
        "visit_done",
        "follow_up",
        "booking",
        "lost",
      ],
    },
  },
} as const
