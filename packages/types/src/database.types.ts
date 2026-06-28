export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          org_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          ends_at: string
          id: string
          org_id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          ends_at: string
          id?: string
          org_id: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          org_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_customer_id_customers_id_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_origins: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_origins_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          email: string | null
          enabled: boolean
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          name: string
          notes: string | null
          org_id: string
          origin_id: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enabled?: boolean
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          origin_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enabled?: boolean
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          origin_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_origin_id_customer_origins_id_fk"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "customer_origins"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_categories_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          stock_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          stock_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          stock_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_material_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          id: string
          joined_at: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_materials: {
        Row: {
          id: string
          material_id: string
          quantity: number
          service_id: string
        }
        Insert: {
          id?: string
          material_id: string
          quantity?: number
          service_id: string
        }
        Update: {
          id?: string
          material_id?: string
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_materials_material_id_materials_id_fk"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_materials_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_transaction_id: string | null
          performed_at: string
          performed_by: string | null
          service_type_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_transaction_id?: string | null
          performed_at?: string
          performed_by?: string | null
          service_type_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_transaction_id?: string | null
          performed_at?: string
          performed_by?: string | null
          service_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_customer_id_customers_id_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_payment_transaction_id_transactions_id_fk"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_service_type_id_service_types_id_fk"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_days: number
          id: string
          org_id: string
          price_cents: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
        }
        Insert: {
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_days?: number
          id?: string
          org_id: string
          price_cents?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Update: {
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_days?: number
          id?: string
          org_id?: string
          price_cents?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transacted_at: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transacted_at?: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          transacted_at?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          name: string
          phone: string | null
          platform_role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
        }
        Insert: {
          auth_id: string
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name: string
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Update: {
          auth_id?: string
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name?: string
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "invite_sent"
        | "invite_accepted"
        | "subscription_changed"
      billing_interval: "monthly" | "semiannual" | "annual"
      gender: "male" | "female" | "other"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      org_role: "owner" | "employee"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "credit_card"
        | "debit_card"
        | "credits"
      platform_role: "super_admin" | "user"
      subscription_status: "active" | "trialing" | "past_due" | "canceled"
      subscription_type: "free" | "trial" | "standard" | "custom"
      transaction_type: "income" | "outcome"
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
      audit_action: [
        "create",
        "update",
        "delete",
        "invite_sent",
        "invite_accepted",
        "subscription_changed",
      ],
      billing_interval: ["monthly", "semiannual", "annual"],
      gender: ["male", "female", "other"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      org_role: ["owner", "employee"],
      payment_method: [
        "cash",
        "bank_transfer",
        "credit_card",
        "debit_card",
        "credits",
      ],
      platform_role: ["super_admin", "user"],
      subscription_status: ["active", "trialing", "past_due", "canceled"],
      subscription_type: ["free", "trial", "standard", "custom"],
      transaction_type: ["income", "outcome"],
    },
  },
} as const
