export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anamnesis_form_versions: {
        Row: {
          created_at: string
          created_by: string | null
          form_id: string
          id: string
          org_id: string
          questions: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form_id: string
          id?: string
          org_id: string
          questions: Json
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form_id?: string
          id?: string
          org_id?: string
          questions?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_form_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_form_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_forms: {
        Row: {
          created_at: string
          id: string
          org_id: string
          service_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          service_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          service_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_forms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_forms_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: true
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_responses: {
        Row: {
          answers: Json | null
          consent_accepted_at: string | null
          consent_text_snapshot: string | null
          consent_version: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          expires_at: string
          form_version_id: string | null
          id: string
          org_id: string
          pdf_hash_sha256: string | null
          pdf_storage_path: string | null
          questions_snapshot: Json
          request_ip: string | null
          request_user_agent: string | null
          service_type_id: string | null
          signature_storage_path: string | null
          signer_cpf: string | null
          signer_full_name: string | null
          status: Database["public"]["Enums"]["anamnesis_response_status"]
          submitted_at: string | null
          token: string
        }
        Insert: {
          answers?: Json | null
          consent_accepted_at?: string | null
          consent_text_snapshot?: string | null
          consent_version?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          expires_at?: string
          form_version_id?: string | null
          id?: string
          org_id: string
          pdf_hash_sha256?: string | null
          pdf_storage_path?: string | null
          questions_snapshot: Json
          request_ip?: string | null
          request_user_agent?: string | null
          service_type_id?: string | null
          signature_storage_path?: string | null
          signer_cpf?: string | null
          signer_full_name?: string | null
          status?: Database["public"]["Enums"]["anamnesis_response_status"]
          submitted_at?: string | null
          token?: string
        }
        Update: {
          answers?: Json | null
          consent_accepted_at?: string | null
          consent_text_snapshot?: string | null
          consent_version?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          expires_at?: string
          form_version_id?: string | null
          id?: string
          org_id?: string
          pdf_hash_sha256?: string | null
          pdf_storage_path?: string | null
          questions_snapshot?: Json
          request_ip?: string | null
          request_user_agent?: string | null
          service_type_id?: string | null
          signature_storage_path?: string | null
          signer_cpf?: string | null
          signer_full_name?: string | null
          status?: Database["public"]["Enums"]["anamnesis_response_status"]
          submitted_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_responses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
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
      billing_coupons: {
        Row: {
          active: boolean
          amount_off_cents: number | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          duration: string
          duration_in_months: number | null
          expires_at: string | null
          id: string
          last_synced_at: string | null
          max_redemptions: number | null
          name: string
          percent_off: number | null
          stripe_coupon_id: string
          stripe_promotion_code_id: string | null
          times_redeemed: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_off_cents?: number | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          duration: string
          duration_in_months?: number | null
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          max_redemptions?: number | null
          name: string
          percent_off?: number | null
          stripe_coupon_id: string
          stripe_promotion_code_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_off_cents?: number | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          duration?: string
          duration_in_months?: number | null
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          max_redemptions?: number | null
          name?: string
          percent_off?: number | null
          stripe_coupon_id?: string
          stripe_promotion_code_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoice_events: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          occurred_at: string
          org_id: string | null
          stripe_invoice_id: string
          type: Database["public"]["Enums"]["billing_invoice_event_type"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          occurred_at: string
          org_id?: string | null
          stripe_invoice_id: string
          type: Database["public"]["Enums"]["billing_invoice_event_type"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          occurred_at?: string
          org_id?: string | null
          stripe_invoice_id?: string
          type?: Database["public"]["Enums"]["billing_invoice_event_type"]
        }
        Relationships: []
      }
      billing_plan_prices: {
        Row: {
          active: boolean
          amount_cents: number
          created_at: string
          currency: string
          id: string
          interval: string
          last_synced_at: string | null
          lookup_key: string | null
          plan_id: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          interval: string
          last_synced_at?: string | null
          lookup_key?: string | null
          plan_id: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          last_synced_at?: string | null
          lookup_key?: string | null
          plan_id?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          active: boolean
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          features: Json
          highlighted: boolean
          id: string
          interval: string
          key: string
          last_synced_at: string | null
          lookup_key: string | null
          metadata: Json
          name: string
          product_key: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          created_at?: string
          currency: string
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          interval: string
          key: string
          last_synced_at?: string | null
          lookup_key?: string | null
          metadata?: Json
          name: string
          product_key?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          interval?: string
          key?: string
          last_synced_at?: string | null
          lookup_key?: string | null
          metadata?: Json
          name?: string
          product_key?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      billing_refund_events: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          occurred_at: string
          org_id: string | null
          reason: string | null
          status: Database["public"]["Enums"]["billing_refund_event_status"]
          stripe_charge_id: string | null
          stripe_refund_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          occurred_at: string
          org_id?: string | null
          reason?: string | null
          status: Database["public"]["Enums"]["billing_refund_event_status"]
          stripe_charge_id?: string | null
          stripe_refund_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          occurred_at?: string
          org_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["billing_refund_event_status"]
          stripe_charge_id?: string | null
          stripe_refund_id?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          connected_at: string | null
          connected_by: string | null
          created_at: string
          external_account_email: string | null
          id: string
          org_id: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          external_account_email?: string | null
          id?: string
          org_id: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          external_account_email?: string | null
          id?: string
          org_id?: string
          provider?: Database["public"]["Enums"]["calendar_provider"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["calendar_attendee_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: Database["public"]["Enums"]["calendar_attendee_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["calendar_attendee_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_to: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          ends_at: string
          id: string
          org_id: string
          reminder_sent_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          title: string
          type: Database["public"]["Enums"]["calendar_event_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["calendar_event_visibility"]
        }
        Insert: {
          all_day?: boolean
          assigned_to: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          ends_at: string
          id?: string
          org_id: string
          reminder_sent_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          title: string
          type?: Database["public"]["Enums"]["calendar_event_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["calendar_event_visibility"]
        }
        Update: {
          all_day?: boolean
          assigned_to?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          org_id?: string
          reminder_sent_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          title?: string
          type?: Database["public"]["Enums"]["calendar_event_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["calendar_event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assigned_to_users_id_fk"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_users_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
      cron_job_state: {
        Row: {
          job_name: string
          last_run_at: string
          updated_at: string
        }
        Insert: {
          job_name: string
          last_run_at: string
          updated_at?: string
        }
        Update: {
          job_name?: string
          last_run_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          customer_id: string
          file_name: string
          id: string
          org_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          customer_id: string
          file_name: string
          id?: string
          org_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          customer_id?: string
          file_name?: string
          id?: string
          org_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_attachments_customer_id_customers_id_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_attachments_org_id_organizations_id_fk"
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
      customer_self_registrations: {
        Row: {
          anamnesis_response_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          email: string
          expires_at: string
          id: string
          org_id: string
          service_type_id: string | null
          status: string
          submitted_at: string | null
          token: string
        }
        Insert: {
          anamnesis_response_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email: string
          expires_at?: string
          id?: string
          org_id: string
          service_type_id?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
        }
        Update: {
          anamnesis_response_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          service_type_id?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_self_registrations_anamnesis_response_id_fkey"
            columns: ["anamnesis_response_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_self_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_self_registrations_customer_org_fk"
            columns: ["customer_id", "org_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "customer_self_registrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_self_registrations_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_update_invitations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          expires_at: string
          id: string
          org_id: string
          status: string
          submitted_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          expires_at?: string
          id?: string
          org_id: string
          status?: string
          submitted_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string
          id?: string
          org_id?: string
          status?: string
          submitted_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_update_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_update_invitations_customer_org_fk"
            columns: ["customer_id", "org_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "customer_update_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          address_line2: string | null
          birth_date: string
          city: string
          country: string | null
          created_at: string
          created_by: string | null
          email: string
          enabled: boolean
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          name: string
          notes: string | null
          number: string
          org_id: string
          origin_id: string | null
          phone: string | null
          postal_code: string | null
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          address_line2?: string | null
          birth_date: string
          city: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          enabled?: boolean
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name: string
          notes?: string | null
          number: string
          org_id: string
          origin_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          address_line2?: string | null
          birth_date?: string
          city?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          enabled?: boolean
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name?: string
          notes?: string | null
          number?: string
          org_id?: string
          origin_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string
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
          archived_at: string | null
          category_id: string | null
          cost_per_unit: number | null
          created_at: string
          id: string
          last_used_at: string | null
          minimum_quantity: number
          name: string
          org_id: string
          shareable: boolean
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          minimum_quantity?: number
          name: string
          org_id: string
          shareable?: boolean
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          minimum_quantity?: number
          name?: string
          org_id?: string
          shareable?: boolean
          stock_quantity?: number
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          org_id: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          org_id?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          org_id?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      org_member_commissions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          mode: string
          org_id: string
          percent: number
          superseded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          org_id: string
          percent?: number
          superseded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          org_id?: string
          percent?: number
          superseded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_member_commissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          enabled: boolean
          id: string
          joined_at: string
          org_id: string
          permissions: string[]
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          joined_at?: string
          org_id: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          joined_at?: string
          org_id?: string
          permissions?: string[]
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
      org_payment_fees: {
        Row: {
          created_at: string
          fixed_cents: number
          id: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fixed_cents?: number
          id?: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fixed_cents?: number
          id?: string
          org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_payment_fees_org_id_organizations_id_fk"
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
          stock_check_interval_days: number | null
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          stock_check_interval_days?: number | null
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          stock_check_interval_days?: number | null
          suspended_at?: string | null
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
      service_media: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          org_id: string
          service_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          org_id: string
          service_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          org_id?: string
          service_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_media_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_media_service_id_fkey"
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
          requires_age_verification: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          requires_age_verification?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          requires_age_verification?: boolean
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
          anamnesis_response_id: string | null
          canceled_at: string | null
          commission_base_cents: number
          commission_cents: number
          commission_config_id: string | null
          commission_mode: string | null
          commission_percent: number | null
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
          anamnesis_response_id?: string | null
          canceled_at?: string | null
          commission_base_cents?: number
          commission_cents?: number
          commission_config_id?: string | null
          commission_mode?: string | null
          commission_percent?: number | null
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
          anamnesis_response_id?: string | null
          canceled_at?: string | null
          commission_base_cents?: number
          commission_cents?: number
          commission_config_id?: string | null
          commission_mode?: string | null
          commission_percent?: number | null
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
            foreignKeyName: "services_anamnesis_response_id_fkey"
            columns: ["anamnesis_response_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_commission_config_id_org_member_commissions_id_fk"
            columns: ["commission_config_id"]
            isOneToOne: false
            referencedRelation: "org_member_commissions"
            referencedColumns: ["id"]
          },
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
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          note: string | null
          org_id: string
          quantity_delta: number
          service_id: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          note?: string | null
          org_id: string
          quantity_delta: number
          service_id?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          note?: string | null
          org_id?: string
          quantity_delta?: number
          service_id?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_materials_id_fk"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_service_id_services_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_verification_items: {
        Row: {
          id: string
          material_id: string
          physical_quantity: number
          system_quantity: number
          verification_id: string
        }
        Insert: {
          id?: string
          material_id: string
          physical_quantity: number
          system_quantity: number
          verification_id: string
        }
        Update: {
          id?: string
          material_id?: string
          physical_quantity?: number
          system_quantity?: number
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_verification_items_material_id_materials_id_fk"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_verification_items_verification_id_stock_verifications_id"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "stock_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_verifications: {
        Row: {
          created_at: string
          id: string
          note: string | null
          org_id: string
          performed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          org_id: string
          performed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_verifications_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          comp_expires_at: string | null
          comp_granted_by: string | null
          comp_reason: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          discount_percent: number | null
          grace_period_days: number
          id: string
          org_id: string
          price_cents: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_coupon_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_consumed: boolean
          trial_ends_at: string | null
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
        }
        Insert: {
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          comp_expires_at?: string | null
          comp_granted_by?: string | null
          comp_reason?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percent?: number | null
          grace_period_days?: number
          id?: string
          org_id: string
          price_cents?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_consumed?: boolean
          trial_ends_at?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Update: {
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          comp_expires_at?: string | null
          comp_granted_by?: string | null
          comp_reason?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percent?: number | null
          grace_period_days?: number
          id?: string
          org_id?: string
          price_cents?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_consumed?: boolean
          trial_ends_at?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_comp_granted_by_fkey"
            columns: ["comp_granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_inbound_emails: {
        Row: {
          email_id: string
          from_email: string
          id: string
          message_id: string | null
          outcome: string | null
          processed_at: string | null
          received_at: string
          response_id: string | null
          ticket_id: string | null
          to_email: string
        }
        Insert: {
          email_id: string
          from_email: string
          id?: string
          message_id?: string | null
          outcome?: string | null
          processed_at?: string | null
          received_at?: string
          response_id?: string | null
          ticket_id?: string | null
          to_email: string
        }
        Update: {
          email_id?: string
          from_email?: string
          id?: string
          message_id?: string | null
          outcome?: string | null
          processed_at?: string | null
          received_at?: string
          response_id?: string | null
          ticket_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_inbound_emails_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "ticket_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_inbound_emails_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          org_id: string | null
          response_id: string | null
          size_bytes: number
          storage_path: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          org_id?: string | null
          response_id?: string | null
          size_bytes: number
          storage_path: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          org_id?: string | null
          response_id?: string | null
          size_bytes?: number
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "ticket_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          sla_first_response_minutes: number
          sla_resolution_minutes: number
          system_key: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          sla_first_response_minutes: number
          sla_resolution_minutes: number
          system_key: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          sla_first_response_minutes?: number
          sla_resolution_minutes?: number
          system_key?: string
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          is_internal_note: boolean
          org_id: string | null
          ticket_id: string
        }
        Insert: {
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal_note?: boolean
          org_id?: string | null
          ticket_id: string
        }
        Update: {
          author_type?: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal_note?: boolean
          org_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_agent_id: string | null
          category_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          first_response_at: string | null
          id: string
          org_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          reopened_at: string | null
          requester_email: string
          requester_name: string
          resolved_at: string | null
          sla_first_response_breached_at: string | null
          sla_first_response_due_at: string
          sla_resolution_breached_at: string | null
          sla_resolution_due_at: string
          sla_warning_notified_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          category_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          first_response_at?: string | null
          id?: string
          org_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reopened_at?: string | null
          requester_email: string
          requester_name: string
          resolved_at?: string | null
          sla_first_response_breached_at?: string | null
          sla_first_response_due_at: string
          sla_resolution_breached_at?: string | null
          sla_resolution_due_at: string
          sla_warning_notified_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          category_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          org_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reopened_at?: string | null
          requester_email?: string
          requester_name?: string
          resolved_at?: string | null
          sla_first_response_breached_at?: string | null
          sla_first_response_due_at?: string
          sla_resolution_breached_at?: string | null
          sla_resolution_due_at?: string
          sla_warning_notified_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          created_at: string
          id: string
          is_protected: boolean
          name: string
          org_id: string
          system_key: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_protected?: boolean
          name: string
          org_id: string
          system_key?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_protected?: boolean
          name?: string
          org_id?: string
          system_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          amount_gross_cents: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          fee_cents: number
          id: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reverses_transaction_id: string | null
          transacted_at: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount_cents: number
          amount_gross_cents?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          fee_cents?: number
          id?: string
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reverses_transaction_id?: string | null
          transacted_at?: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount_cents?: number
          amount_gross_cents?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          fee_cents?: number
          id?: string
          org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reverses_transaction_id?: string | null
          transacted_at?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_transaction_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reverses_transaction_id_transactions_id_fk"
            columns: ["reverses_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
          onboarding_completed_at: string | null
          phone: string | null
          platform_role: Database["public"]["Enums"]["platform_role"]
          terms_accepted_at: string | null
          terms_version: string | null
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
          onboarding_completed_at?: string | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          terms_accepted_at?: string | null
          terms_version?: string | null
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
          onboarding_completed_at?: string | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_org_owner: { Args: { p_org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      anamnesis_response_status: "pending" | "submitted"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "invite_sent"
        | "invite_accepted"
        | "subscription_changed"
        | "anamnesis_invite_sent"
        | "customer_self_registration_invite_sent"
        | "customer_self_registered"
        | "customer_update_invite_sent"
        | "customer_self_updated"
        | "anamnesis_invite_resent"
        | "anamnesis_copy_sent"
        | "cashier_transaction_created"
        | "cashier_fees_updated"
        | "cashier_commissions_updated"
        | "org_admin_access"
      billing_interval: "monthly" | "semiannual" | "annual"
      billing_invoice_event_type: "paid" | "payment_failed"
      billing_refund_event_status:
        | "pending"
        | "requires_action"
        | "succeeded"
        | "failed"
        | "canceled"
      calendar_attendee_status: "going" | "not_going"
      calendar_event_status: "scheduled" | "canceled"
      calendar_event_type: "appointment" | "unavailability"
      calendar_event_visibility: "private" | "shared"
      calendar_provider: "google" | "outlook" | "apple"
      gender: "male" | "female" | "other"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      notification_type:
        | "agenda_reminder"
        | "member_unavailability"
        | "stock_check_reminder"
      org_role: "owner" | "employee"
      payment_method: "cash" | "bank_transfer" | "credit_card" | "debit_card"
      platform_role: "super_admin" | "user"
      stock_movement_type:
        | "restock"
        | "service_consumption"
        | "manual_adjustment"
      subscription_status: "active" | "trialing" | "past_due" | "canceled"
      subscription_type: "free" | "trial" | "standard" | "custom"
      ticket_author_type: "customer" | "agent" | "system"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_customer"
        | "resolved"
        | "closed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      anamnesis_response_status: ["pending", "submitted"],
      audit_action: [
        "create",
        "update",
        "delete",
        "invite_sent",
        "invite_accepted",
        "subscription_changed",
        "anamnesis_invite_sent",
        "customer_self_registration_invite_sent",
        "customer_self_registered",
        "customer_update_invite_sent",
        "customer_self_updated",
        "anamnesis_invite_resent",
        "anamnesis_copy_sent",
        "cashier_transaction_created",
        "cashier_fees_updated",
        "cashier_commissions_updated",
        "org_admin_access",
      ],
      billing_interval: ["monthly", "semiannual", "annual"],
      billing_invoice_event_type: ["paid", "payment_failed"],
      billing_refund_event_status: [
        "pending",
        "requires_action",
        "succeeded",
        "failed",
        "canceled",
      ],
      calendar_attendee_status: ["going", "not_going"],
      calendar_event_status: ["scheduled", "canceled"],
      calendar_event_type: ["appointment", "unavailability"],
      calendar_event_visibility: ["private", "shared"],
      calendar_provider: ["google", "outlook", "apple"],
      gender: ["male", "female", "other"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      notification_type: [
        "agenda_reminder",
        "member_unavailability",
        "stock_check_reminder",
      ],
      org_role: ["owner", "employee"],
      payment_method: ["cash", "bank_transfer", "credit_card", "debit_card"],
      platform_role: ["super_admin", "user"],
      stock_movement_type: [
        "restock",
        "service_consumption",
        "manual_adjustment",
      ],
      subscription_status: ["active", "trialing", "past_due", "canceled"],
      subscription_type: ["free", "trial", "standard", "custom"],
      ticket_author_type: ["customer", "agent", "system"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
      ],
      transaction_type: ["income", "outcome"],
    },
  },
} as const

