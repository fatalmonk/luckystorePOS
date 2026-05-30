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
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category: string
          color: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string | null
          store_id: string | null
          tenant_id: string | null
        }
        Insert: {
          category: string
          color?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          store_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          category?: string
          color?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
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
          admin_override: boolean
          close_status: string
          conflict_count: number
          dual_approval_required: boolean
          failed_count: number
          id: string
          last_sync_success_at: string | null
          notes: string | null
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
        }
        Insert: {
          acknowledgement_confirmed?: boolean
          admin_override?: boolean
          close_status: string
          conflict_count?: number
          dual_approval_required?: boolean
          failed_count?: number
          id?: string
          last_sync_success_at?: string | null
          notes?: string | null
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
        }
        Update: {
          acknowledgement_confirmed?: boolean
          admin_override?: boolean
          close_status?: string
          conflict_count?: number
          dual_approval_required?: boolean
          failed_count?: number
          id?: string
          last_sync_success_at?: string | null
          notes?: string | null
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
          competitor_price: number
          competitor_url: string | null
          created_at: string | null
          id: string
          item_id: string | null
          last_updated: string | null
        }
        Insert: {
          competitor_name: string
          competitor_price: number
          competitor_url?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          last_updated?: string | null
        }
        Update: {
          competitor_name?: string
          competitor_price?: number
          competitor_url?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
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
          active: boolean | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          group_tag: string | null
          id: string
          image_url: string | null
          mrp: number | null
          name: string
          price: number | null
          short_code: string | null
          sku: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          group_tag?: string | null
          id?: string
          image_url?: string | null
          mrp?: number | null
          name: string
          price?: number | null
          short_code?: string | null
          sku?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          group_tag?: string | null
          id?: string
          image_url?: string | null
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
          status: string
          store_id: string | null
          tenant_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          store_id?: string | null
          tenant_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
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
          batch_id: string
          created_at: string
          credit: number
          debit: number
          id: string
          line_ref: string | null
          sale_id: string | null
        }
        Insert: {
          account_id: string
          annotation?: Json
          batch_id: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          line_ref?: string | null
          sale_id?: string | null
        }
        Update: {
          account_id?: string
          annotation?: Json
          batch_id?: string
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          line_ref?: string | null
          sale_id?: string | null
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
            foreignKeyName: "ledger_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
      parties: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
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
          discount_amount: number | null
          fulfilled_subtotal: number | null
          id: string
          ledger_batch_id: string | null
          notes: string | null
          payment_meta: Json | null
          payment_method: string | null
          sale_number: string
          session_id: string | null
          status: string | null
          store_id: string | null
          subtotal: number | null
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
          discount_amount?: number | null
          fulfilled_subtotal?: number | null
          id?: string
          ledger_batch_id?: string | null
          notes?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          sale_number: string
          session_id?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
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
          discount_amount?: number | null
          fulfilled_subtotal?: number | null
          id?: string
          ledger_batch_id?: string | null
          notes?: string | null
          payment_meta?: Json | null
          payment_method?: string | null
          sale_number?: string
          session_id?: string | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
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
          reserved: number | null
          store_id: string
        }
        Insert: {
          item_id: string
          qty?: number | null
          reserved?: number | null
          store_id: string
        }
        Update: {
          item_id?: string
          qty?: number | null
          reserved?: number | null
          store_id?: string
        }
        Relationships: [
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
          name: string
          tenant_id: string
          timezone: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string
          timezone?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      complete_sale: {
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
      current_tenant_id: { Args: never; Returns: string }
      deactivate_ledger_worker: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
      decrement_stock: {
        Args: { p_item_id: string; p_quantity: number; p_store_id: string }
        Returns: undefined
      }
      deduct_stock: {
        Args: {
          p_metadata?: Json
          p_product_id: string
          p_quantity: number
          p_store_id: string
        }
        Returns: Json
      }
      delete_reminder: { Args: { p_reminder_id: string }; Returns: boolean }
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
      generate_daily_reconciliation: {
        Args: { p_date: string; p_store_id: string }
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
      get_daily_movement_trend: {
        Args: { p_days?: number; p_store_id: string }
        Returns: {
          net_delta: number
          total_in: number
          total_out: number
          trend_date: string
        }[]
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
      get_inventory_summary: { Args: { p_store_id: string }; Returns: Json }
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
      heartbeat_ledger_worker: {
        Args: { p_worker_id: string }
        Returns: undefined
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
      is_ledger_worker_alive: {
        Args: { p_max_staleness?: string; p_worker_id: string }
        Returns: boolean
      }
      is_period_closed: {
        Args: { p_posted_at: string; p_store_id: string }
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
      lookup_item_by_scan: {
        Args: { p_scan_value: string; p_store_id: string }
        Returns: Json
      }
      mark_followup_resolved: { Args: { p_note_id: string }; Returns: boolean }
      post_draft_purchase_receipt: {
        Args: { p_receipt_id: string }
        Returns: Json
      }
      post_sale_to_ledger: { Args: { p_sale_id: string }; Returns: Json }
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
      record_customer_payment: {
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
      search_items_pos: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_store_id: string
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
      sync_offline_orders: {
        Args: { p_orders: Json }
        Returns: {
          message: string
          order_id: string
          status: string
        }[]
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
      update_stock_transfer_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["stock_transfer_status"]
          p_notes?: string
          p_transfer_id: string
        }
        Returns: boolean
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
      payment_type: "cash" | "mobile_banking" | "card" | "other"
      po_status:
        | "draft"
        | "ordered"
        | "partially_received"
        | "received"
        | "cancelled"
      sale_status: "completed" | "voided" | "refunded"
      session_status: "open" | "closed"
      stock_transfer_status:
        | "pending"
        | "in_transit"
        | "completed"
        | "cancelled"
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
      discount_type: ["percentage", "fixed"],
      payment_type: ["cash", "mobile_banking", "card", "other"],
      po_status: [
        "draft",
        "ordered",
        "partially_received",
        "received",
        "cancelled",
      ],
      sale_status: ["completed", "voided", "refunded"],
      session_status: ["open", "closed"],
      stock_transfer_status: [
        "pending",
        "in_transit",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
