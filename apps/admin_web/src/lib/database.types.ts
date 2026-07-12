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
      _schema_refresh_trigger: {
        Row: {
          id: number
          updated_at: string | null
        }
        Insert: {
          id?: number
          updated_at?: string | null
        }
        Update: {
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          status: string
          store_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          store_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          new_row: Json | null
          old_row: Json | null
          operation: string
          performed_at: string
          performed_by: string | null
          primary_key: Json
          table_name: string
        }
        Insert: {
          id?: string
          new_row?: Json | null
          old_row?: Json | null
          operation: string
          performed_at?: string
          performed_by?: string | null
          primary_key: Json
          table_name: string
        }
        Update: {
          id?: string
          new_row?: Json | null
          old_row?: Json | null
          operation?: string
          performed_at?: string
          performed_by?: string | null
          primary_key?: Json
          table_name?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          batch_code: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          item_id: string | null
          qty: number
          supplier: string | null
        }
        Insert: {
          batch_code?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          qty?: number
          supplier?: string | null
        }
        Update: {
          batch_code?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          qty?: number
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          items: Json | null
          session_id: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          items?: Json | null
          session_id: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          items?: Json | null
          session_id?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean | null
          category: string
          color: string | null
          display_order: number | null
          emoji: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string | null
          slug: string | null
          store_id: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          color?: string | null
          display_order?: number | null
          emoji?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          slug?: string | null
          store_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          color?: string | null
          display_order?: number | null
          emoji?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          slug?: string | null
          store_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      close_review_log: {
        Row: {
          acknowledgement_confirmed: boolean
          actual_cash: number | null
          admin_override: boolean
          cash_sales: number | null
          close_status: string
          conflict_count: number
          dual_approval_required: boolean
          expected_drawer: number | null
          failed_count: number
          id: string
          last_sync_success_at: string | null
          manager_override_pin_verified: boolean | null
          manager_override_required: boolean | null
          notes: string | null
          opening_cash: number | null
          override_notes: string | null
          override_reason: string | null
          override_reason_category: string | null
          queue_pending_count: number
          reviewed_at: string
          reviewer_role: string
          reviewer_user_id: string
          secondary_approver_role: string | null
          secondary_approver_user_id: string | null
          session_id: string
          store_id: string
          variance_amount: number | null
          variance_notes: string | null
          variance_status: string | null
          variance_threshold_exceeded: boolean | null
        }
        Insert: {
          acknowledgement_confirmed?: boolean
          actual_cash?: number | null
          admin_override?: boolean
          cash_sales?: number | null
          close_status: string
          conflict_count?: number
          dual_approval_required?: boolean
          expected_drawer?: number | null
          failed_count?: number
          id?: string
          last_sync_success_at?: string | null
          manager_override_pin_verified?: boolean | null
          manager_override_required?: boolean | null
          notes?: string | null
          opening_cash?: number | null
          override_notes?: string | null
          override_reason?: string | null
          override_reason_category?: string | null
          queue_pending_count?: number
          reviewed_at?: string
          reviewer_role: string
          reviewer_user_id: string
          secondary_approver_role?: string | null
          secondary_approver_user_id?: string | null
          session_id: string
          store_id: string
          variance_amount?: number | null
          variance_notes?: string | null
          variance_status?: string | null
          variance_threshold_exceeded?: boolean | null
        }
        Update: {
          acknowledgement_confirmed?: boolean
          actual_cash?: number | null
          admin_override?: boolean
          cash_sales?: number | null
          close_status?: string
          conflict_count?: number
          dual_approval_required?: boolean
          expected_drawer?: number | null
          failed_count?: number
          id?: string
          last_sync_success_at?: string | null
          manager_override_pin_verified?: boolean | null
          manager_override_required?: boolean | null
          notes?: string | null
          opening_cash?: number | null
          override_notes?: string | null
          override_reason?: string | null
          override_reason_category?: string | null
          queue_pending_count?: number
          reviewed_at?: string
          reviewer_role?: string
          reviewer_user_id?: string
          secondary_approver_role?: string | null
          secondary_approver_user_id?: string | null
          session_id?: string
          store_id?: string
          variance_amount?: number | null
          variance_notes?: string | null
          variance_status?: string | null
          variance_threshold_exceeded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "close_review_log_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_review_log_secondary_approver_user_id_fkey"
            columns: ["secondary_approver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_review_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_review_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_prices: {
        Row: {
          competitor_name: string
          competitor_original_price: number | null
          competitor_price: number
          competitor_product_id: string | null
          competitor_product_url: string | null
          created_at: string
          currency: string | null
          error_message: string | null
          id: string
          item_id: string | null
          our_price: number | null
          price_gap_percent: number | null
          product_name: string
          product_sku: string | null
          raw_data: Json | null
          scrape_batch_id: string | null
          scrape_status: string | null
          scraped_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          competitor_name: string
          competitor_original_price?: number | null
          competitor_price: number
          competitor_product_id?: string | null
          competitor_product_url?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          item_id?: string | null
          our_price?: number | null
          price_gap_percent?: number | null
          product_name: string
          product_sku?: string | null
          raw_data?: Json | null
          scrape_batch_id?: string | null
          scrape_status?: string | null
          scraped_at?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          competitor_name?: string
          competitor_original_price?: number | null
          competitor_price?: number
          competitor_product_id?: string | null
          competitor_product_url?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          item_id?: string | null
          our_price?: number | null
          price_gap_percent?: number | null
          product_name?: string
          product_sku?: string | null
          raw_data?: Json | null
          scrape_batch_id?: string | null
          scrape_status?: string | null
          scraped_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_prices_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_prices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          note: string | null
          sale_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: string
          id?: string
          note?: string | null
          sale_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          sale_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reminders: {
        Row: {
          created_at: string
          id: string
          party_id: string
          reminder_type: string
          sent_at: string
          sent_by: string | null
          store_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_id: string
          reminder_type: string
          sent_at?: string
          sent_by?: string | null
          store_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          party_id?: string
          reminder_type?: string
          sent_at?: string
          sent_by?: string | null
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reminders_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminders_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          balance: number | null
          created_at: string | null
          credit_limit: number | null
          id: string
          name: string
          phone_whatsapp: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          name: string
          phone_whatsapp?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          name?: string
          phone_whatsapp?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales: {
        Row: {
          bkash_amount: number | null
          cash_amount: number | null
          created_at: string | null
          credit_amount: number | null
          daily_expense: number | null
          id: string
          sale_date: string
          stock_purchase: number | null
          store_id: string
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          bkash_amount?: number | null
          cash_amount?: number | null
          created_at?: string | null
          credit_amount?: number | null
          daily_expense?: number | null
          id?: string
          sale_date: string
          stock_purchase?: number | null
          store_id: string
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          bkash_amount?: number | null
          cash_amount?: number | null
          created_at?: string | null
          credit_amount?: number | null
          daily_expense?: number | null
          id?: string
          sale_date?: string
          stock_purchase?: number | null
          store_id?: string
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          delivery_fee: number
          id: string
          is_active: boolean
          radius_km: number
          store_id: string | null
          store_lat: number
          store_lng: number
          tenant_id: string
        }
        Insert: {
          delivery_fee?: number
          id?: string
          is_active?: boolean
          radius_km?: number
          store_id?: string | null
          store_lat: number
          store_lng: number
          tenant_id: string
        }
        Update: {
          delivery_fee?: number
          id?: string
          is_active?: boolean
          radius_km?: number
          store_id?: string | null
          store_lat?: number
          store_lng?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          store_id: string
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          store_id: string
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          store_id?: string
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          ledger_batch_id: string | null
          payment_type: string
          store_id: string
          tenant_id: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          ledger_batch_id?: string | null
          payment_type: string
          store_id: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          ledger_batch_id?: string | null
          payment_type?: string
          store_id?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_ledger_batch_id_fkey"
            columns: ["ledger_batch_id"]
            isOneToOne: false
            referencedRelation: "ledger_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note_text: string
          party_id: string
          promise_to_pay_date: string | null
          status: string
          store_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_text: string
          party_id: string
          promise_to_pay_date?: string | null
          status?: string
          store_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_text?: string
          party_id?: string
          promise_to_pay_date?: string | null
          status?: string
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_notes_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_notes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string
          idempotency_key: string
          locked_at: string | null
          response_body: Json | null
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          idempotency_key: string
          locked_at?: string | null
          response_body?: Json | null
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          idempotency_key?: string
          locked_at?: string | null
          response_body?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_count: number
          file_name: string
          finished_at: string | null
          id: string
          initiated_by: string | null
          row_count: number
          rows_failed: number
          rows_succeeded: number
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_count?: number
          file_name: string
          finished_at?: string | null
          id?: string
          initiated_by?: string | null
          row_count?: number
          rows_failed?: number
          rows_succeeded?: number
          status?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_count?: number
          file_name?: string
          finished_at?: string | null
          id?: string
          initiated_by?: string | null
          row_count?: number
          rows_failed?: number
          rows_succeeded?: number
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          created_at: string | null
          created_by: string | null
          delta: number
          id: string
          product_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delta: number
          id?: string
          product_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delta?: number
          id?: string
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          name: string
          sku: string | null
          tenant_id: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          name: string
          sku?: string | null
          tenant_id: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          name?: string
          sku?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          new_quantity: number
          notes: string | null
          operation_id: string | null
          previous_quantity: number
          product_id: string
          quantity_delta: number
          reference_id: string | null
          reference_type: Database["public"]["Enums"]["reference_type"]
          store_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          new_quantity: number
          notes?: string | null
          operation_id?: string | null
          previous_quantity: number
          product_id: string
          quantity_delta: number
          reference_id?: string | null
          reference_type: Database["public"]["Enums"]["reference_type"]
          store_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          new_quantity?: number
          notes?: string | null
          operation_id?: string | null
          previous_quantity?: number
          product_id?: string
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["reference_type"]
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          counted_by: string
          counted_quantity: number
          created_at: string
          difference: number
          expected_quantity: number
          id: string
          notes: string | null
          product_id: string
          status: Database["public"]["Enums"]["reconciliation_status"]
          store_id: string
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          counted_by: string
          counted_quantity: number
          created_at?: string
          difference: number
          expected_quantity: number
          id?: string
          notes?: string | null
          product_id: string
          status?: Database["public"]["Enums"]["reconciliation_status"]
          store_id: string
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          counted_by?: string
          counted_quantity?: number
          created_at?: string
          difference?: number
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id?: string
          status?: Database["public"]["Enums"]["reconciliation_status"]
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_batches: {
        Row: {
          batch_number: string
          created_at: string
          expires_at: string | null
          id: string
          item_id: string
          manufactured_at: string | null
          notes: string | null
          po_id: string | null
          qty: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id: string
          manufactured_at?: string | null
          notes?: string | null
          po_id?: string | null
          qty?: number
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id?: string
          manufactured_at?: string | null
          notes?: string | null
          po_id?: string | null
          qty?: number
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_batches_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          barcode: string | null
          brand: string | null
          category_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          group_tag: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          mrp: number | null
          name: string
          price: number | null
          short_code: string | null
          sku: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          group_tag?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mrp?: number | null
          name: string
          price?: number | null
          short_code?: string | null
          sku?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          group_tag?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mrp?: number | null
          name?: string
          price?: number | null
          short_code?: string | null
          sku?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_batches: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          source_id: string | null
          source_ref: string | null
          source_type: string | null
          status: string
          store_id: string | null
          tenant_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          source_id?: string | null
          source_ref?: string | null
          source_type?: string | null
          status?: string
          store_id?: string | null
          tenant_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          source_id?: string | null
          source_ref?: string | null
          source_type?: string | null
          status?: string
          store_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_batches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kv_store_5fa4635f: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      ledger_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          parent_account_id: string | null
          store_id: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          parent_account_id?: string | null
          store_id: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          parent_account_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_batches: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          override_used: boolean
          posted_at: string
          reverses_batch_id: string | null
          risk_flag: boolean
          risk_note: string | null
          source_id: string | null
          source_ref: string | null
          source_type: string
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          override_used?: boolean
          posted_at?: string
          reverses_batch_id?: string | null
          risk_flag?: boolean
          risk_note?: string | null
          source_id?: string | null
          source_ref?: string | null
          source_type: string
          status?: string
          store_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          override_used?: boolean
          posted_at?: string
          reverses_batch_id?: string | null
          risk_flag?: boolean
          risk_note?: string | null
          source_id?: string | null
          source_ref?: string | null
          source_type?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_batches_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_batches_reverses_batch_id_fkey"
            columns: ["reverses_batch_id"]
            isOneToOne: false
            referencedRelation: "ledger_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          annotation: Json
          batch_id: string | null
          created_at: string
          created_by: string | null
          credit: number
          credit_amount: number
          debit: number
          debit_amount: number
          effective_date: string | null
          id: string
          line_ref: string | null
          notes: string | null
          party_id: string | null
          reference_id: string | null
          reference_type: string | null
          sale_id: string | null
          store_id: string | null
          tenant_id: string | null
        }
        Insert: {
          account_id: string
          annotation?: Json
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          credit_amount?: number
          debit?: number
          debit_amount?: number
          effective_date?: string | null
          id?: string
          line_ref?: string | null
          notes?: string | null
          party_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          store_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_id?: string
          annotation?: Json
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          credit_amount?: number
          debit?: number
          debit_amount?: number
          effective_date?: string | null
          id?: string
          line_ref?: string | null
          notes?: string | null
          party_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          store_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ledger_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_posting_idempotency: {
        Row: {
          attempt_count: number
          completed_at: string | null
          first_started_at: string
          last_attempt_at: string
          last_error: string | null
          ledger_batch_id: string | null
          posting_state: string
          sale_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          first_started_at?: string
          last_attempt_at?: string
          last_error?: string | null
          ledger_batch_id?: string | null
          posting_state?: string
          sale_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          first_started_at?: string
          last_attempt_at?: string
          last_error?: string | null
          ledger_batch_id?: string | null
          posting_state?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_posting_idempotency_ledger_batch_id_fkey"
            columns: ["ledger_batch_id"]
            isOneToOne: false
            referencedRelation: "ledger_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_posting_idempotency_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_posting_queue: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          last_error: string | null
          lock_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string
          priority: number
          sale_id: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string
          priority?: number
          sale_id: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string
          priority?: number
          sale_id?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_posting_queue_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_posting_queue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_workers: {
        Row: {
          active: boolean
          created_at: string
          last_heartbeat: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          last_heartbeat?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          last_heartbeat?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      online_order_items: {
        Row: {
          id: string
          item_id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          item_id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          item_id?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      online_orders: {
        Row: {
          cancellation_reason: string | null
          created_at: string | null
          customer_name: string
          customer_whatsapp: string
          delivery_address: string
          delivery_fee: number | null
          id: string
          order_number: string
          payment_method: string | null
          status: string | null
          store_id: string
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string | null
          customer_name: string
          customer_whatsapp: string
          delivery_address: string
          delivery_fee?: number | null
          id?: string
          order_number: string
          payment_method?: string | null
          status?: string | null
          store_id: string
          subtotal: number
          tenant_id: string
          total: number
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string | null
          customer_name?: string
          customer_whatsapp?: string
          delivery_address?: string
          delivery_fee?: number | null
          id?: string
          order_number?: string
          payment_method?: string | null
          status?: string | null
          store_id?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_slot: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          payment_method: string
          status: string
          store_id: string
          subtotal: number
          tenant_id: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_slot?: string | null
          id?: string
          items: Json
          notes?: string | null
          order_number: string
          payment_method?: string
          status?: string
          store_id?: string
          subtotal: number
          tenant_id: string
          total: number
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_slot?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string
          status?: string
          store_id?: string
          subtotal?: number
          tenant_id?: string
          total?: number
        }
        Relationships: []
      }
      other_income: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["other_income_category"]
          created_at: string
          date: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["other_income_payment_method"]
          store_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["other_income_category"]
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["other_income_payment_method"]
          store_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["other_income_category"]
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["other_income_payment_method"]
          store_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "other_income_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "other_income_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          created_at: string
          current_balance: number | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          current_balance?: number | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          current_balance?: number | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          store_id: string
          type: Database["public"]["Enums"]["payment_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          store_id: string
          type?: Database["public"]["Enums"]["payment_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          store_id?: string
          type?: Database["public"]["Enums"]["payment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string
          reference: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method: string
          reference?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          reference?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_override_tokens: {
        Row: {
          affected_items: Json
          created_at: string
          expires_at: string
          id: string
          issued_by: string
          reason: string
          store_id: string
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          affected_items?: Json
          created_at?: string
          expires_at: string
          id?: string
          issued_by: string
          reason: string
          store_id: string
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          affected_items?: Json
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string
          reason?: string
          store_id?: string
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_override_tokens_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_override_tokens_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_override_tokens_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          cashier_id: string
          closed_at: string | null
          closing_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_cash: number
          session_number: string
          status: Database["public"]["Enums"]["session_status"]
          store_id: string
          total_cash: number
          total_sales: number
        }
        Insert: {
          cashier_id: string
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_cash?: number
          session_number: string
          status?: Database["public"]["Enums"]["session_status"]
          store_id: string
          total_cash?: number
          total_sales?: number
        }
        Update: {
          cashier_id?: string
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_cash?: number
          session_number?: string
          status?: Database["public"]["Enums"]["session_status"]
          store_id?: string
          total_cash?: number
          total_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      price_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          item_id: string
          new_cost: number | null
          new_mrp: number | null
          new_price: number | null
          old_cost: number | null
          old_mrp: number | null
          old_price: number | null
          source: string | null
          store_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          item_id: string
          new_cost?: number | null
          new_mrp?: number | null
          new_price?: number | null
          old_cost?: number | null
          old_mrp?: number | null
          old_price?: number | null
          source?: string | null
          store_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          item_id?: string
          new_cost?: number | null
          new_mrp?: number | null
          new_price?: number | null
          old_cost?: number | null
          old_mrp?: number | null
          old_price?: number | null
          source?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_audit_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_audit_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_audit_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost: number | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_bn: string | null
          name_en: string
          price: number
          reorder_point: number | null
          reserved_online: number
          sku: string | null
          stock_qty: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_bn?: string | null
          name_en: string
          price?: number
          reorder_point?: number | null
          reserved_online?: number
          sku?: string | null
          stock_qty?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_bn?: string | null
          name_en?: string
          price?: number
          reorder_point?: number | null
          reserved_online?: number
          sku?: string | null
          stock_qty?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          city_scope: string | null
          created_at: string | null
          discount_pct: number | null
          ends_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          city_scope?: string | null
          created_at?: string | null
          discount_pct?: number | null
          ends_at: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          city_scope?: string | null
          created_at?: string | null
          discount_pct?: number | null
          ends_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          item_id: string
          po_id: string
          qty_ordered: number
          qty_received: number
          unit_cost: number
        }
        Insert: {
          id?: string
          item_id: string
          po_id: string
          qty_ordered: number
          qty_received?: number
          unit_cost?: number
        }
        Update: {
          id?: string
          item_id?: string
          po_id?: string
          qty_ordered?: number
          qty_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          po_number: string
          status: Database["public"]["Enums"]["po_status"]
          store_id: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number: string
          status?: Database["public"]["Enums"]["po_status"]
          store_id: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string
          status?: Database["public"]["Enums"]["po_status"]
          store_id?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipt_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          receipt_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity: number
          receipt_id: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          receipt_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          amount_paid: number | null
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          invoice_total: number | null
          notes: string | null
          status: string
          store_id: string
          supplier_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          invoice_total?: number | null
          notes?: string | null
          status?: string
          store_id: string
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          invoice_total?: number | null
          notes?: string | null
          status?: string
          store_id?: string
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      receipt_config: {
        Row: {
          currency_symbol: string
          footer_text: string | null
          header_text: string | null
          label_height_mm: number | null
          label_printer_name: string | null
          label_printer_type: string | null
          label_width_mm: number | null
          logo_url: string | null
          receipt_printer_name: string | null
          receipt_printer_type: string | null
          show_tax: boolean
          store_id: string
          store_name: string | null
          updated_at: string
        }
        Insert: {
          currency_symbol?: string
          footer_text?: string | null
          header_text?: string | null
          label_height_mm?: number | null
          label_printer_name?: string | null
          label_printer_type?: string | null
          label_width_mm?: number | null
          logo_url?: string | null
          receipt_printer_name?: string | null
          receipt_printer_type?: string | null
          show_tax?: boolean
          store_id: string
          store_name?: string | null
          updated_at?: string
        }
        Update: {
          currency_symbol?: string
          footer_text?: string | null
          header_text?: string | null
          label_height_mm?: number | null
          label_printer_name?: string | null
          label_printer_type?: string | null
          label_width_mm?: number | null
          logo_url?: string | null
          receipt_printer_name?: string | null
          receipt_printer_type?: string | null
          show_tax?: boolean
          store_id?: string
          store_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_counters: {
        Row: {
          counter: number | null
          date: string
          store_id: string
        }
        Insert: {
          counter?: number | null
          date: string
          store_id: string
        }
        Update: {
          counter?: number | null
          date?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_counters_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          reminder_date: string
          reminder_type: string
          store_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          reminder_date: string
          reminder_type: string
          store_id: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          reminder_date?: string
          reminder_type?: string
          store_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string | null
          id: string
          processed_by: string | null
          reason: string | null
          refund_amount: number | null
          sale_id: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number | null
          sale_id?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number | null
          sale_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_audit_log: {
        Row: {
          after_state: Json
          before_state: Json
          client_transaction_id: string
          created_at: string
          id: string
          operator_user_id: string | null
          override_reason: string | null
          override_used: boolean
          override_user_id: string | null
          sale_id: string | null
          status: string
          stock_delta: Json
          store_id: string
        }
        Insert: {
          after_state?: Json
          before_state?: Json
          client_transaction_id: string
          created_at?: string
          id?: string
          operator_user_id?: string | null
          override_reason?: string | null
          override_used?: boolean
          override_user_id?: string | null
          sale_id?: string | null
          status: string
          stock_delta?: Json
          store_id: string
        }
        Update: {
          after_state?: Json
          before_state?: Json
          client_transaction_id?: string
          created_at?: string
          id?: string
          operator_user_id?: string | null
          override_reason?: string | null
          override_used?: boolean
          override_user_id?: string | null
          sale_id?: string | null
          status?: string
          stock_delta?: Json
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_audit_log_operator_user_id_fkey"
            columns: ["operator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_audit_log_override_user_id_fkey"
            columns: ["override_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_audit_log_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_audit_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          batch_id: string | null
          cost: number | null
          id: string
          item_id: string | null
          line_total: number | null
          price: number | null
          qty: number | null
          sale_id: string | null
        }
        Insert: {
          batch_id?: string | null
          cost?: number | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          price?: number | null
          qty?: number | null
          sale_id?: string | null
        }
        Update: {
          batch_id?: string | null
          cost?: number | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          price?: number | null
          qty?: number | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method_id: string
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method_id: string
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method_id?: string
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_sync_conflicts: {
        Row: {
          client_transaction_id: string
          conflict_type: string
          created_at: string
          details: Json
          id: string
          requires_manager_review: boolean
          resolved_at: string | null
          resolved_by: string | null
          status: string
          store_id: string
        }
        Insert: {
          client_transaction_id: string
          conflict_type: string
          created_at?: string
          details?: Json
          id?: string
          requires_manager_review?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          store_id: string
        }
        Update: {
          client_transaction_id?: string
          conflict_type?: string
          created_at?: string
          details?: Json
          id?: string
          requires_manager_review?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_sync_conflicts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          accounting_posted_at: string | null
          accounting_posting_error: string | null
          accounting_posting_status: string
          amount_tendered: number | null
          backordered_subtotal: number | null
          cashier_id: string | null
          change_due: number | null
          client_transaction_id: string | null
          created_at: string | null
          customer_id: string | null
          discount: number | null
          discount_amount: number | null
          fulfilled_subtotal: number | null
          id: string
          invoice_sent_at: string | null
          invoice_sent_via: string | null
          ledger_batch_id: string | null
          notes: string | null
          offline_created_at: string | null
          operation_id: string | null
          payment_meta: Json | null
          payment_method: string | null
          sale_number: string
          session_id: string | null
          status: string | null
          store_id: string | null
          subtotal: number | null
          synced_at: string | null
          total: number | null
          total_amount: number | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          accounting_posted_at?: string | null
          accounting_posting_error?: string | null
          accounting_posting_status?: string
          amount_tendered?: number | null
          backordered_subtotal?: number | null
          cashier_id?: string | null
          change_due?: number | null
          client_transaction_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number | null
          discount_amount?: number | null
          fulfilled_subtotal?: number | null
          id?: string
          invoice_sent_at?: string | null
          invoice_sent_via?: string | null
          ledger_batch_id?: string | null
          notes?: string | null
          offline_created_at?: string | null
          operation_id?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          sale_number: string
          session_id?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          synced_at?: string | null
          total?: number | null
          total_amount?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          accounting_posted_at?: string | null
          accounting_posting_error?: string | null
          accounting_posting_status?: string
          amount_tendered?: number | null
          backordered_subtotal?: number | null
          cashier_id?: string | null
          change_due?: number | null
          client_transaction_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number | null
          discount_amount?: number | null
          fulfilled_subtotal?: number | null
          id?: string
          invoice_sent_at?: string | null
          invoice_sent_via?: string | null
          ledger_batch_id?: string | null
          notes?: string | null
          offline_created_at?: string | null
          operation_id?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          sale_number?: string
          session_id?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          synced_at?: string | null
          total?: number | null
          total_amount?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_ledger_batch_id_fkey"
            columns: ["ledger_batch_id"]
            isOneToOne: false
            referencedRelation: "ledger_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          id: string
          link: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string | null
          status: string
          store_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          link?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string | null
          status: string
          store_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          link?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string | null
          status?: string
          store_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stock_alert_thresholds: {
        Row: {
          created_at: string
          item_id: string
          min_qty: number
          reorder_qty: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          item_id: string
          min_qty?: number
          reorder_qty?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          min_qty?: number
          reorder_qty?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alert_thresholds_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alert_thresholds_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alert_thresholds_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          movement_id: string | null
          new_quantity: number
          performed_by: string | null
          previous_quantity: number
          product_id: string
          quantity_change: number
          reason: string
          reference_id: string | null
          store_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          movement_id?: string | null
          new_quantity?: number
          performed_by?: string | null
          previous_quantity?: number
          product_id: string
          quantity_change: number
          reason: string
          reference_id?: string | null
          store_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          movement_id?: string | null
          new_quantity?: number
          performed_by?: string | null
          previous_quantity?: number
          product_id?: string
          quantity_change?: number
          reason?: string
          reference_id?: string | null
          store_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          item_id: string
          qty: number | null
          qty_reserved_online: number | null
          reserved: number | null
          store_id: string
          tenant_id: string | null
        }
        Insert: {
          item_id: string
          qty?: number | null
          qty_reserved_online?: number | null
          reserved?: number | null
          store_id: string
          tenant_id?: string | null
        }
        Update: {
          item_id?: string
          qty?: number | null
          qty_reserved_online?: number | null
          reserved?: number | null
          store_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          delta: number
          id: string
          item_id: string | null
          meta: Json | null
          notes: string | null
          performed_by: string | null
          quantity_change: number | null
          reason: string
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          tenant_id: string | null
          weighted_average_cost: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delta: number
          id?: string
          item_id?: string | null
          meta?: Json | null
          notes?: string | null
          performed_by?: string | null
          quantity_change?: number | null
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          tenant_id?: string | null
          weighted_average_cost?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delta?: number
          id?: string
          item_id?: string | null
          meta?: Json | null
          notes?: string | null
          performed_by?: string | null
          quantity_change?: number | null
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          tenant_id?: string | null
          weighted_average_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          item_id: string
          qty: number
          transfer_id: string
        }
        Insert: {
          id?: string
          item_id: string
          qty: number
          transfer_id: string
        }
        Update: {
          id?: string
          item_id?: string
          qty?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_store_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["stock_transfer_status"]
          to_store_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_store_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["stock_transfer_status"]
          to_store_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_store_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["stock_transfer_status"]
          to_store_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          location: unknown
          name: string
          tenant_id: string
          timezone: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          location?: unknown
          name: string
          tenant_id?: string
          timezone?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          location?: unknown
          name?: string
          tenant_id?: string
          timezone?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          name: string | null
          pos_pin: string | null
          pos_pin_hash: string | null
          role: string
          store_id: string | null
          tenant_id: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          name?: string | null
          pos_pin?: string | null
          pos_pin_hash?: string | null
          role: string
          store_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          name?: string | null
          pos_pin?: string | null
          pos_pin_hash?: string | null
          role?: string
          store_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          direction: string | null
          display_phone_number: string | null
          id: string
          message_body: string | null
          message_id: string | null
          message_type: string | null
          payload: Json | null
          phone_number_id: string | null
          recipient: string | null
          response: Json | null
          sender: string | null
          status: string | null
          template: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          display_phone_number?: string | null
          id?: string
          message_body?: string | null
          message_id?: string | null
          message_type?: string | null
          payload?: Json | null
          phone_number_id?: string | null
          recipient?: string | null
          response?: Json | null
          sender?: string | null
          status?: string | null
          template?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          display_phone_number?: string | null
          id?: string
          message_body?: string | null
          message_id?: string | null
          message_type?: string | null
          payload?: Json | null
          phone_number_id?: string | null
          recipient?: string | null
          response?: Json | null
          sender?: string | null
          status?: string | null
          template?: string | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          customer_fingerprint: string
          customer_phone: string | null
          id: string
          product_id: string
          product_name: string
        }
        Insert: {
          created_at?: string
          customer_fingerprint: string
          customer_phone?: string | null
          id?: string
          product_id: string
          product_name: string
        }
        Update: {
          created_at?: string
          customer_fingerprint?: string
          customer_phone?: string | null
          id?: string
          product_id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "featured_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      featured_products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number | null
          created_at: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          mrp: number | null
          name: string | null
          price: number | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      homepage_categories: {
        Row: {
          id: string | null
          name: string | null
          product_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_batch_and_adjust_stock: {
        Args: {
          p_batch_number: string
          p_expires_at?: string
          p_item_id: string
          p_manufactured_at?: string
          p_notes?: string
          p_po_id?: string
          p_qty: number
          p_store_id: string
        }
        Returns: string
      }
      add_followup_note: {
        Args: {
          p_note_text: string
          p_party_id: string
          p_promise_date?: string
          p_store_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      adjust_inventory_stock:
        | {
            Args: {
              p_allow_negative?: boolean
              p_movement_type: Database["public"]["Enums"]["movement_type"]
              p_notes?: string
              p_product_id: string
              p_quantity_delta: number
              p_reference_id?: string
              p_reference_type: Database["public"]["Enums"]["reference_type"]
              p_store_id: string
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_allow_negative?: boolean
              p_movement_type: Database["public"]["Enums"]["movement_type"]
              p_notes?: string
              p_operation_id?: string
              p_product_id: string
              p_quantity_delta: number
              p_reference_id?: string
              p_reference_type: Database["public"]["Enums"]["reference_type"]
              p_store_id: string
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_allow_negative?: boolean
              p_expected_quantity?: number
              p_movement_type: Database["public"]["Enums"]["movement_type"]
              p_notes?: string
              p_operation_id?: string
              p_product_id: string
              p_quantity_delta: number
              p_reference_id?: string
              p_reference_type: Database["public"]["Enums"]["reference_type"]
              p_store_id: string
              p_tenant_id: string
            }
            Returns: Json
          }
      adjust_stock: {
        Args: {
          p_delta: number
          p_item_id: string
          p_notes?: string
          p_performed_by?: string
          p_reason: string
          p_store_id: string
        }
        Returns: Json
      }
      approve_inventory_reconciliation: {
        Args: { p_notes?: string; p_reconciliation_id: string }
        Returns: Json
      }
      authenticate_staff_pin: {
        Args: { p_pin: string }
        Returns: {
          auth_id: string
          full_name: string
          id: string
          role: string
          store_id: string
        }[]
      }
      check_idempotency: {
        Args: { p_key: string; p_tenant_id: string }
        Returns: Json
      }
      check_price_alerts: {
        Args: { p_store_id: string; p_threshold?: number }
        Returns: {
          competitors: Json
          market_avg_price: number
          our_price: number
          price_gap_percent: number
          product_id: string
          product_name: string
        }[]
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_sec: number }
        Returns: Json
      }
      claim_ledger_posting_jobs: {
        Args: {
          p_batch_size?: number
          p_store_id?: string
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          created_at: string
          id: string
          last_error: string | null
          lock_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string
          priority: number
          sale_id: string
          status: string
          store_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ledger_posting_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_old_competitor_prices: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: number }
      close_accounting_period: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_store_id: string
        }
        Returns: Json
      }
      close_pos_session: {
        Args: { p_closing_cash: number; p_session_id: string }
        Returns: Json
      }
      close_session_with_reconciliation: {
        Args: {
          p_actual_cash: number
          p_notes?: string
          p_session_id: string
          p_variance: number
        }
        Returns: Json
      }
      complete_sale:
        | {
            Args: {
              p_items: Json
              p_payment_method_id: string
              p_sale_type?: string
              p_session_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cashier_id: string
              p_client_transaction_id?: string
              p_discount?: number
              p_fulfillment_policy?: string
              p_items?: Json
              p_notes?: string
              p_override_reason?: string
              p_override_token?: string
              p_payments?: Json
              p_session_id?: string
              p_snapshot?: Json
              p_store_id: string
            }
            Returns: Json
          }
      complete_sale_v2: {
        Args: {
          p_cashier_id: string
          p_customer_id?: string
          p_discount?: number
          p_items?: Json
          p_offline_created_at?: string
          p_operation_id?: string
          p_payments?: Json
          p_store_id: string
          p_total?: number
        }
        Returns: Json
      }
      create_order_with_stock:
        | {
            Args: {
              p_customer_address: string
              p_customer_name: string
              p_customer_phone: string
              p_delivery_fee: number
              p_items: Json
              p_notes?: string
              p_order_number: string
              p_store_id: string
              p_subtotal: number
              p_tenant_id: string
              p_total: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_customer_address: string
              p_customer_name: string
              p_customer_phone: string
              p_delivery_fee: number
              p_delivery_slot?: string
              p_items: Json
              p_notes?: string
              p_order_number: string
              p_store_id: string
              p_subtotal: number
              p_tenant_id: string
              p_total: number
            }
            Returns: Json
          }
      create_reminder: {
        Args: {
          p_created_by?: string
          p_description: string
          p_reminder_date: string
          p_reminder_type: string
          p_store_id: string
          p_tenant_id: string
          p_title: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          reminder_date: string
          reminder_type: string
          store_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reminders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_sale: {
        Args: {
          p_cashier_id: string
          p_client_transaction_id?: string
          p_discount?: number
          p_fulfillment_policy?: string
          p_items?: Json
          p_notes?: string
          p_override_reason?: string
          p_override_token?: string
          p_payments?: Json
          p_session_id?: string
          p_snapshot?: Json
          p_store_id: string
        }
        Returns: Json
      }
      create_stock_transfer: {
        Args: {
          p_from_store_id: string
          p_items: Json
          p_notes: string
          p_to_store_id: string
        }
        Returns: string
      }
      create_store_user: {
        Args: {
          p_auth_id: string
          p_email: string
          p_full_name: string
          p_pin: string
          p_role: string
          p_store_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      current_tenant_id: { Args: never; Returns: string }
      deactivate_ledger_worker: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
      decrement_stock: {
        Args: { p_item_id: string; p_quantity: number; p_store_id: string }
        Returns: undefined
      }
      deduct_stock:
        | {
            Args: {
              p_metadata?: Json
              p_product_id: string
              p_quantity: number
              p_store_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_metadata?: Json
              p_operation_id?: string
              p_product_id: string
              p_quantity: number
              p_store_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_expected_quantity?: number
              p_metadata?: Json
              p_operation_id?: string
              p_product_id: string
              p_quantity: number
              p_store_id: string
            }
            Returns: Json
          }
      delete_ledger_transaction: {
        Args: { p_batch_id: string; p_party_id: string }
        Returns: Json
      }
      delete_reminder: { Args: { p_reminder_id: string }; Returns: boolean }
      delete_store_user: { Args: { p_user_id: string }; Returns: boolean }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_sale_for_ledger_posting: {
        Args: { p_priority?: number; p_sale_id: string; p_store_id: string }
        Returns: string
      }
      ensure_expense_ledger_accounts: {
        Args: { p_store_id: string }
        Returns: undefined
      }
      ensure_sale_ledger_accounts: {
        Args: { p_store_id: string }
        Returns: undefined
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_daily_reconciliation: {
        Args: { p_date: string; p_store_id: string }
        Returns: Json
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_cashflow_data: {
        Args: { p_days?: number; p_store_id: string }
        Returns: Json
      }
      get_close_risk_analytics: {
        Args: {
          p_from?: string
          p_manager_user_id?: string
          p_store_id?: string
          p_to?: string
        }
        Returns: Json
      }
      get_current_user_store_id: { Args: never; Returns: string }
      get_current_user_tenant_id: { Args: never; Returns: string }
      get_customer_analytics: {
        Args: { p_limit?: number; p_store_id: string }
        Returns: {
          avg_order_value: number
          customer_name: string
          days_since_last: number
          last_purchase_date: string
          party_id: string
          phone: string
          purchase_count: number
          total_spent: number
        }[]
      }
      get_daily_movement_trend: {
        Args: { p_days?: number; p_store_id: string }
        Returns: {
          net_delta: number
          total_in: number
          total_out: number
          trend_date: string
        }[]
      }
      get_dashboard_missing_metrics: {
        Args: { p_store_id: string }
        Returns: Json
      }
      get_expected_cash: {
        Args: {
          p_account_id: string
          p_date?: string
          p_store_id: string
          p_tenant_id: string
        }
        Returns: number
      }
      get_expiring_batches: {
        Args: { p_days?: number; p_store_id: string }
        Returns: {
          batch_id: string
          batch_number: string
          days_left: number
          expires_at: string
          item_id: string
          item_name: string
          qty: number
          sku: string
          status: string
        }[]
      }
      get_inventory_list: {
        Args: { p_store_id: string }
        Returns: {
          active: boolean
          barcode: string
          category_id: string
          category_name: string
          cost: number
          current_qty: number
          id: string
          image_url: string
          last_updated: string
          min_qty: number
          mrp: number
          name: string
          price: number
          reorder_status: string
          sku: string
          stock: number
        }[]
      }
      get_inventory_list_v2: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_status?: string
          p_store_id: string
        }
        Returns: {
          available_qty: number
          category_id: string
          category_name: string
          cost: number
          id: string
          image_url: string
          margin_pct: number
          min_qty: number
          mrp: number
          name: string
          price: number
          reorder_status: string
          reserved_qty: number
          sku: string
          total_count: number
          total_qty: number
          total_value: number
        }[]
      }
      get_inventory_movements: {
        Args: {
          p_limit?: number
          p_movement_type?: Database["public"]["Enums"]["movement_type"]
          p_offset?: number
          p_product_id?: string
          p_store_id: string
        }
        Returns: {
          created_at: string
          created_by: string
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          new_quantity: number
          notes: string
          performer_name: string
          previous_quantity: number
          product_id: string
          product_name: string
          product_sku: string
          quantity_delta: number
          reference_id: string
          reference_type: Database["public"]["Enums"]["reference_type"]
        }[]
      }
      get_inventory_summary: { Args: { p_store_id: string }; Returns: Json }
      get_inventory_value: { Args: { p_store_id: string }; Returns: Json }
      get_low_stock_items: {
        Args: { p_store_id: string }
        Returns: {
          category_name: string
          current_qty: number
          image_url: string
          item_id: string
          item_name: string
          min_qty: number
          reorder_qty: number
          sku: string
        }[]
      }
      get_manager_dashboard_stats: {
        Args: { p_store_id: string }
        Returns: Json
      }
      get_monthly_governance_scorecard: {
        Args: {
          p_manager_user_id?: string
          p_month?: string
          p_store_id?: string
        }
        Returns: Json
      }
      get_monthly_trend_metrics: { Args: { p_store_id: string }; Returns: Json }
      get_new_receipt: { Args: { store: string }; Returns: string }
      get_offline_sync_status: {
        Args: { p_order_ids: string[] }
        Returns: {
          is_synced: boolean
          order_id: string
          synced_at: string
        }[]
      }
      get_or_create_ar_account: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_party_ledger: {
        Args: { p_date_from?: string; p_date_to?: string; p_party_id: string }
        Returns: {
          account_id: string
          batch_id: string
          created_at: string
          credit_amount: number
          debit_amount: number
          effective_date: string
          id: string
          notes: string
          party_id: string
          reference_id: string
          reference_type: string
          store_id: string
          tenant_id: string
        }[]
      }
      get_payment_methods: {
        Args: { p_store_id: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          store_id: string
          type: Database["public"]["Enums"]["payment_type"]
        }[]
        SetofOptions: {
          from: "*"
          to: "payment_methods"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pos_categories: { Args: { p_store_id: string }; Returns: Json }
      get_price_history: {
        Args: { p_item_id: string; p_limit?: number; p_store_id: string }
        Returns: {
          changed_at: string
          changed_by: string
          id: string
          new_mrp: number
          new_price: number
          old_mrp: number
          old_price: number
        }[]
      }
      get_profit_loss: {
        Args: { p_end_date: string; p_start_date: string; p_store_id: string }
        Returns: Json
      }
      get_receipt_config_simple: {
        Args: { p_store_id: string }
        Returns: {
          currency_symbol: string
          footer_text: string | null
          header_text: string | null
          label_height_mm: number | null
          label_printer_name: string | null
          label_printer_type: string | null
          label_width_mm: number | null
          logo_url: string | null
          receipt_printer_name: string | null
          receipt_printer_type: string | null
          show_tax: boolean
          store_id: string
          store_name: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "receipt_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_receivables_aging: {
        Args: { p_search?: string; p_store_id: string; p_tenant_id: string }
        Returns: {
          balance_due: number
          customer_name: string
          days_overdue: number
          last_note: string
          party_id: string
          phone: string
          promise_to_pay_date: string
        }[]
      }
      get_retail_kpis: {
        Args: { p_days?: number; p_store_id: string }
        Returns: Json
      }
      get_sale_details: { Args: { p_sale_id: string }; Returns: Json }
      get_sales_history: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_start_date?: string
          p_store_id: string
        }
        Returns: {
          cashier_name: string
          created_at: string
          id: string
          sale_number: string
          status: string
          total_amount: number
        }[]
      }
      get_sales_report: {
        Args: { p_end_date: string; p_start_date: string; p_store_id: string }
        Returns: Json
      }
      get_session_summary: { Args: { p_session_id: string }; Returns: Json }
      get_slow_moving_items: {
        Args: { p_days?: number; p_limit?: number; p_store_id: string }
        Returns: {
          category_name: string
          item_id: string
          item_name: string
          last_sold_at: string
          qty_on_hand: number
          sku: string
          total_cost: number
        }[]
      }
      get_staff_performance: {
        Args: { p_days?: number; p_store_id: string }
        Returns: {
          active_days: number
          avg_ticket: number
          revenue_per_day: number
          role: string
          staff_name: string
          total_discounts: number
          total_revenue: number
          total_sales: number
          user_id: string
        }[]
      }
      get_stock_history_simple: {
        Args: { p_item_id?: string; p_limit?: number; p_store_id: string }
        Returns: {
          created_at: string
          delta: number
          id: string
          item_name: string
          notes: string
          performer_name: string
          reason: string
        }[]
      }
      get_stock_level_by_id: {
        Args: { p_item_id: string; p_store_id: string }
        Returns: {
          item_id: string
          quantity: number
          recent_movements: Json
          store_id: string
        }[]
      }
      get_stock_movements: {
        Args: {
          p_item_id?: string
          p_limit?: number
          p_offset?: number
          p_store_id?: string
        }
        Returns: {
          created_at: string
          delta: number
          id: string
          item_id: string
          item_name: string
          meta: Json
          notes: string
          performed_by: string
          performer_name: string
          reason: string
          store_code: string
          store_id: string
        }[]
      }
      get_stock_valuation: {
        Args: { p_limit?: number; p_store_id: string }
        Returns: {
          category_name: string
          item_id: string
          item_name: string
          margin_pct: number
          qty_on_hand: number
          sku: string
          total_cost: number
          total_value: number
          unit_cost: number
          unit_price: number
        }[]
      }
      get_store_users: {
        Args: { p_store_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
          last_login: string
          role: string
        }[]
      }
      get_top_selling_items: {
        Args: { p_days?: number; p_limit?: number; p_store_id: string }
        Returns: {
          category_name: string
          item_id: string
          item_name: string
          sku: string
          total_profit: number
          total_qty: number
          total_revenue: number
        }[]
      }
      get_upcoming_reminders: {
        Args: { p_include_completed?: boolean; p_store_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          reminder_date: string
          reminder_type: string
          store_id: string
          tenant_id: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reminders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      gettransactionid: { Args: never; Returns: unknown }
      heartbeat_ledger_worker: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      import_apply_stock_delta: {
        Args: { p_delta: number; p_item_id: string; p_store_id: string }
        Returns: boolean
      }
      import_historical_daily_sale: {
        Args: {
          p_bkash_amount: number
          p_cash_amount: number
          p_date: string
          p_store_id: string
        }
        Returns: Json
      }
      is_admin_in_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      is_ledger_worker_alive: {
        Args: { p_max_staleness?: string; p_worker_id: string }
        Returns: boolean
      }
      is_period_closed: {
        Args: { p_posted_at: string; p_store_id: string }
        Returns: boolean
      }
      is_within_delivery_range: {
        Args: {
          p_customer_lat: number
          p_customer_lng: number
          p_store_id: string
        }
        Returns: boolean
      }
      issue_pos_override_token: {
        Args: {
          p_affected_items?: Json
          p_reason: string
          p_store_id: string
          p_ttl_minutes?: number
        }
        Returns: Json
      }
      log_customer_reminder: {
        Args: {
          p_party_id: string
          p_store_id: string
          p_tenant_id: string
          p_type: string
        }
        Returns: string
      }
      log_sale_sync_conflict: {
        Args: {
          p_client_transaction_id: string
          p_conflict_type: string
          p_details?: Json
          p_requires_manager_review?: boolean
          p_store_id: string
        }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      lookup_item_by_scan: {
        Args: { p_barcode: string; p_store_id: string }
        Returns: {
          item_id: string
          mrp: number
          name: string
          price: number
          stock: number
        }[]
      }
      mark_followup_resolved: { Args: { p_note_id: string }; Returns: boolean }
      pgrst_schema_cache_refresh: { Args: never; Returns: undefined }
      ping: { Args: never; Returns: string }
      place_online_order: {
        Args: {
          p_address: string
          p_customer_name: string
          p_delivery_fee: number
          p_items: Json
          p_store_id: string
          p_subtotal: number
          p_total: number
          p_whatsapp: string
        }
        Returns: Json
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      post_draft_purchase_receipt: {
        Args: { p_receipt_id: string }
        Returns: Json
      }
      post_sale_to_ledger: { Args: { p_sale_id: string }; Returns: Json }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_ledger_posting_batch: {
        Args: {
          p_batch_size?: number
          p_store_id?: string
          p_worker_id: string
        }
        Returns: Json
      }
      process_pending_ledger_postings: {
        Args: { p_limit?: number; p_store_id?: string }
        Returns: Json
      }
      receive_purchase_order: {
        Args: { p_notes?: string; p_po_id: string; p_received_items: Json }
        Returns: Json
      }
      reclaim_stale_ledger_locks: { Args: never; Returns: number }
      record_cash_closing: {
        Args: {
          p_account_id: string
          p_actual_cash: number
          p_date?: string
          p_idempotency_key: string
          p_notes?: string
          p_store_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      record_customer_payment:
        | {
            Args: {
              p_amount: number
              p_client_transaction_id?: string
              p_idempotency_key: string
              p_notes?: string
              p_party_id: string
              p_payment_account_id: string
              p_store_id: string
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_collected_by?: string
              p_party_id: string
              p_payment_method: string
              p_reference?: string
            }
            Returns: Json
          }
      record_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_date: string
          p_description: string
          p_payment_type: string
          p_store_id: string
          p_vendor: string
        }
        Returns: Json
      }
      record_purchase: {
        Args: {
          p_amount_paid?: number
          p_idempotency_key: string
          p_invoice_number?: string
          p_invoice_total?: number
          p_items?: Json
          p_notes?: string
          p_payable_account_id?: string
          p_payment_account_id?: string
          p_status?: string
          p_store_id: string
          p_supplier_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      record_purchase_v2: {
        Args: {
          p_amount_paid?: number
          p_idempotency_key: string
          p_invoice_number?: string
          p_invoice_total?: number
          p_items?: Json
          p_notes?: string
          p_payable_account_id?: string
          p_payment_account_id?: string
          p_status?: string
          p_store_id: string
          p_supplier_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      record_supplier_payment: {
        Args: {
          p_amount: number
          p_payment_method: string
          p_reference?: string
          p_store_id?: string
          p_supplier_id: string
          p_user_id?: string
        }
        Returns: string
      }
      register_ledger_worker: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
      renew_ledger_job_lease: {
        Args: { p_queue_id: string; p_worker_id: string }
        Returns: boolean
      }
      replay_sale_ledger_chain: { Args: { p_sale_id: string }; Returns: Json }
      resolve_payment_ledger_account: {
        Args: { p_payment_method_id: string; p_store_id: string }
        Returns: string
      }
      search_items_pos:
        | {
            Args: { p_query: string; p_store_id: string }
            Returns: {
              item_id: string
              name: string
              price: number
              stock: number
            }[]
          }
        | {
            Args: {
              p_category_id?: string
              p_limit?: number
              p_offset?: number
              p_query?: string
              p_store_id: string
            }
            Returns: Json
          }
      search_products: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          barcode: string
          category_id: string
          cost: number
          id: string
          image_url: string
          is_active: boolean
          mrp: number
          name: string
          price: number
          sku: string
        }[]
      }
      set_inventory_stock:
        | {
            Args: {
              p_movement_type: Database["public"]["Enums"]["movement_type"]
              p_new_quantity: number
              p_notes?: string
              p_product_id: string
              p_reference_id?: string
              p_reference_type: Database["public"]["Enums"]["reference_type"]
              p_store_id: string
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_movement_type: Database["public"]["Enums"]["movement_type"]
              p_new_quantity: number
              p_notes?: string
              p_operation_id?: string
              p_product_id: string
              p_reference_id?: string
              p_reference_type: Database["public"]["Enums"]["reference_type"]
              p_store_id: string
              p_tenant_id: string
            }
            Returns: Json
          }
      set_stock: {
        Args: {
          p_item_id: string
          p_new_qty: number
          p_notes?: string
          p_reason: string
          p_store_id: string
        }
        Returns: Json
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      sync_offline_orders: {
        Args: { p_orders: Json }
        Returns: {
          message: string
          order_id: string
          status: string
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_item_prices: {
        Args: {
          p_cost?: number
          p_item_id: string
          p_mrp?: number
          p_price: number
          p_tenant_id: string
        }
        Returns: {
          item_cost: number
          item_id: string
          item_mrp: number
          item_name: string
          item_price: number
          item_sku: string
          item_updated_at: string
        }[]
      }
      update_online_order_status: {
        Args: { p_new_status: string; p_order_id: string; p_reason?: string }
        Returns: Json
      }
      update_receipt_config_simple: {
        Args: {
          p_footer_text: string
          p_header_text: string
          p_store_id: string
          p_store_name: string
        }
        Returns: {
          currency_symbol: string
          footer_text: string | null
          header_text: string | null
          label_height_mm: number | null
          label_printer_name: string | null
          label_printer_type: string | null
          label_width_mm: number | null
          logo_url: string | null
          receipt_printer_name: string | null
          receipt_printer_type: string | null
          show_tax: boolean
          store_id: string
          store_name: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "receipt_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_reminder: {
        Args: {
          p_description?: string
          p_is_completed?: boolean
          p_reminder_date?: string
          p_reminder_id: string
          p_reminder_type?: string
          p_title?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          reminder_date: string
          reminder_type: string
          store_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reminders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_staff_pin: {
        Args: { p_pin: string; p_user_id: string }
        Returns: boolean
      }
      update_stock_transfer_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["stock_transfer_status"]
          p_notes?: string
          p_transfer_id: string
        }
        Returns: boolean
      }
      update_store_user: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_stock_level: {
        Args: { p_item_id: string; p_quantity: number; p_store_id: string }
        Returns: undefined
      }
      validate_sale_intent: { Args: { p_snapshot: Json }; Returns: Json }
      validate_trial_balance: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_store_id: string
        }
        Returns: Json
      }
      void_sale: {
        Args: { p_reason?: string; p_sale_id: string }
        Returns: Json
      }
    }
    Enums: {
      discount_type: "percentage" | "fixed"
      movement_type:
        | "sale"
        | "purchase"
        | "adjustment"
        | "return"
        | "damage"
        | "transfer"
        | "manual"
        | "sync_repair"
      other_income_category: "Display Fee" | "Delivery" | "Miscellaneous"
      other_income_payment_method: "Cash" | "bKash" | "Bank"
      payment_type: "cash" | "mobile_banking" | "card" | "other"
      po_status:
        | "draft"
        | "ordered"
        | "partially_received"
        | "received"
        | "cancelled"
      reconciliation_status: "pending" | "approved" | "rejected"
      reference_type:
        | "sale"
        | "purchase"
        | "expense"
        | "adjustment"
        | "system"
        | "sync"
      sale_status: "completed" | "voided" | "refunded"
      session_status: "open" | "closed"
      social_platform: "facebook" | "instagram"
      stock_transfer_status:
        | "pending"
        | "in_transit"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      discount_type: ["percentage", "fixed"],
      movement_type: [
        "sale",
        "purchase",
        "adjustment",
        "return",
        "damage",
        "transfer",
        "manual",
        "sync_repair",
      ],
      other_income_category: ["Display Fee", "Delivery", "Miscellaneous"],
      other_income_payment_method: ["Cash", "bKash", "Bank"],
      payment_type: ["cash", "mobile_banking", "card", "other"],
      po_status: [
        "draft",
        "ordered",
        "partially_received",
        "received",
        "cancelled",
      ],
      reconciliation_status: ["pending", "approved", "rejected"],
      reference_type: [
        "sale",
        "purchase",
        "expense",
        "adjustment",
        "system",
        "sync",
      ],
      sale_status: ["completed", "voided", "refunded"],
      session_status: ["open", "closed"],
      social_platform: ["facebook", "instagram"],
      stock_transfer_status: [
        "pending",
        "in_transit",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
