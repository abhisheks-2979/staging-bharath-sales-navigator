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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      additional_expenses: {
        Row: {
          amount: number
          bill_url: string | null
          category: string
          created_at: string
          custom_category: string | null
          description: string | null
          expense_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bill_url?: string | null
          category: string
          created_at?: string
          custom_category?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_url?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_likes: {
        Row: {
          created_at: string
          id: string
          liked_at: string
          page_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_at?: string
          page_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_at?: string
          page_type?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_views: {
        Row: {
          created_at: string
          id: string
          user_id: string
          viewed_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          viewed_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          viewed_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      approvers: {
        Row: {
          approver_level: number
          created_at: string
          department: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approver_level: number
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approver_level?: number
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in_address: string | null
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_address: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beat_allowances: {
        Row: {
          average_km: number | null
          average_time_minutes: number | null
          beat_id: string
          beat_name: string
          created_at: string
          daily_allowance: number
          id: string
          travel_allowance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id: string
          beat_name: string
          created_at?: string
          daily_allowance?: number
          id?: string
          travel_allowance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id?: string
          beat_name?: string
          created_at?: string
          daily_allowance?: number
          id?: string
          travel_allowance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beat_plans: {
        Row: {
          beat_data: Json
          beat_id: string
          beat_name: string
          created_at: string
          id: string
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beat_data?: Json
          beat_id: string
          beat_name: string
          created_at?: string
          id?: string
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beat_data?: Json
          beat_id?: string
          beat_name?: string
          created_at?: string
          id?: string
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      branding_requests: {
        Row: {
          approved_at: string | null
          assigned_vendor_id: string | null
          budget: number | null
          created_at: string
          description: string | null
          due_date: string | null
          executed_at: string | null
          id: string
          manager_comments: string | null
          manager_id: string | null
          pincode: string | null
          procurement_id: string | null
          requested_assets: string | null
          retailer_id: string
          size: string | null
          status: Database["public"]["Enums"]["branding_status"]
          title: string | null
          updated_at: string
          user_id: string
          verification_photo_url: string | null
          visit_id: string
        }
        Insert: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          manager_comments?: string | null
          manager_id?: string | null
          pincode?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_id: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id: string
          verification_photo_url?: string | null
          visit_id: string
        }
        Update: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          manager_comments?: string | null
          manager_id?: string | null
          pincode?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_id?: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
          verification_photo_url?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_requests_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_insights: {
        Row: {
          action_required: boolean | null
          competitor_name: string
          created_at: string
          description: string
          id: string
          impact_level: string | null
          insight_type: string
          product_category: string | null
          retailer_id: string
          updated_at: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          action_required?: boolean | null
          competitor_name: string
          created_at?: string
          description: string
          id?: string
          impact_level?: string | null
          insight_type: string
          product_category?: string | null
          retailer_id: string
          updated_at?: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          action_required?: boolean | null
          competitor_name?: string
          created_at?: string
          description?: string
          id?: string
          impact_level?: string | null
          insight_type?: string
          product_category?: string | null
          retailer_id?: string
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          content_type: string | null
          created_at: string
          doc_type: Database["public"]["Enums"]["employee_doc_type"]
          file_name: string | null
          file_path: string
          id: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          doc_type: Database["public"]["Enums"]["employee_doc_type"]
          file_name?: string | null
          file_path: string
          id?: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["employee_doc_type"]
          file_name?: string | null
          file_path?: string
          id?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          alternate_email: string | null
          created_at: string
          daily_da_allowance: number
          date_of_exit: string | null
          date_of_joining: string | null
          education: string | null
          emergency_contact_number: string | null
          hq: string | null
          manager_id: string | null
          monthly_salary: number
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          alternate_email?: string | null
          created_at?: string
          daily_da_allowance?: number
          date_of_exit?: string | null
          date_of_joining?: string | null
          education?: string | null
          emergency_contact_number?: string | null
          hq?: string | null
          manager_id?: string | null
          monthly_salary?: number
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          alternate_email?: string | null
          created_at?: string
          daily_da_allowance?: number
          date_of_exit?: string | null
          date_of_joining?: string | null
          education?: string | null
          emergency_contact_number?: string | null
          hq?: string | null
          manager_id?: string | null
          monthly_salary?: number
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string
          date: string
          description: string | null
          holiday_name: string
          id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          holiday_name: string
          id?: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          holiday_name?: string
          id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      leave_applications: {
        Row: {
          applied_date: string
          approved_by: string | null
          approved_date: string | null
          created_at: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_date?: string
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type_id: string
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_date?: string
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leave_applications_leave_type_id"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance: {
        Row: {
          created_at: string
          id: string
          leave_type_id: string
          opening_balance: number
          remaining_balance: number | null
          updated_at: string
          used_balance: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type_id: string
          opening_balance?: number
          remaining_balance?: number | null
          updated_at?: string
          used_balance?: number
          user_id: string
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          leave_type_id?: string
          opening_balance?: number
          remaining_balance?: number | null
          updated_at?: string
          used_balance?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_leave_balance_leave_type_id"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_table: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category: string
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          rate: number
          total: number
          unit: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          rate: number
          total: number
          unit: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          rate?: number
          total?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount_amount: number | null
          id: string
          retailer_id: string | null
          retailer_name: string
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          id?: string
          retailer_id?: string | null
          retailer_name: string
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          id?: string
          retailer_id?: string | null
          retailer_name?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_schemes: {
        Row: {
          condition_quantity: number | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          free_quantity: number | null
          id: string
          is_active: boolean | null
          name: string
          product_id: string | null
          quantity_condition_type: string | null
          scheme_type: string
          start_date: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          condition_quantity?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          free_quantity?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          product_id?: string | null
          quantity_condition_type?: string | null
          scheme_type?: string
          start_date?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          condition_quantity?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          free_quantity?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_id?: string | null
          quantity_condition_type?: string | null
          scheme_type?: string
          start_date?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_schemes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_schemes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          price: number
          product_id: string
          sku: string
          stock_quantity: number
          updated_at: string
          variant_name: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          price?: number
          product_id: string
          sku: string
          stock_quantity?: number
          updated_at?: string
          variant_name: string
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          price?: number
          product_id?: string
          sku?: string
          stock_quantity?: number
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          closing_stock: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_number: string | null
          rate: number
          sku: string
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          closing_stock?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_number?: string | null
          rate?: number
          sku: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          closing_stock?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_number?: string | null
          rate?: number
          sku?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          invitation_token: string | null
          phone_number: string | null
          recovery_email: string | null
          updated_at: string
          user_status: Database["public"]["Enums"]["user_status"] | null
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          invitation_token?: string | null
          phone_number?: string | null
          recovery_email?: string | null
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          hint_answer?: string
          hint_question?: string
          id?: string
          invitation_token?: string | null
          phone_number?: string | null
          recovery_email?: string | null
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username?: string
        }
        Relationships: []
      }
      regularization_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_date: string
          created_at: string
          current_check_in_time: string | null
          current_check_out_time: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_check_in_time: string | null
          requested_check_out_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date: string
          created_at?: string
          current_check_in_time?: string | null
          current_check_out_time?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_check_in_time?: string | null
          requested_check_out_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string
          created_at?: string
          current_check_in_time?: string | null
          current_check_out_time?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_check_in_time?: string | null
          requested_check_out_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retailer_feedback: {
        Row: {
          comments: string | null
          created_at: string
          feedback_type: string
          id: string
          rating: number | null
          retailer_id: string
          updated_at: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          rating?: number | null
          retailer_id: string
          updated_at?: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          rating?: number | null
          retailer_id?: string
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      retailers: {
        Row: {
          address: string
          beat_id: string
          beat_name: string | null
          category: string | null
          competitors: string[] | null
          created_at: string
          entity_type: string
          id: string
          last_visit_date: string | null
          latitude: number | null
          location_tag: string | null
          longitude: number | null
          name: string
          notes: string | null
          order_value: number | null
          parent_name: string | null
          parent_type: string | null
          phone: string | null
          photo_url: string | null
          potential: string | null
          priority: string | null
          retail_type: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          beat_id: string
          beat_name?: string | null
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          entity_type?: string
          id?: string
          last_visit_date?: string | null
          latitude?: number | null
          location_tag?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          order_value?: number | null
          parent_name?: string | null
          parent_type?: string | null
          phone?: string | null
          photo_url?: string | null
          potential?: string | null
          priority?: string | null
          retail_type?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          beat_id?: string
          beat_name?: string | null
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          entity_type?: string
          id?: string
          last_visit_date?: string | null
          latitude?: number | null
          location_tag?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          order_value?: number | null
          parent_name?: string | null
          parent_type?: string | null
          phone?: string | null
          photo_url?: string | null
          potential?: string | null
          priority?: string | null
          retail_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity: number
          updated_at: string
          user_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity?: number
          updated_at?: string
          user_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          retailer_id?: string
          stock_quantity?: number
          updated_at?: string
          user_id?: string
          visit_id?: string
        }
        Relationships: []
      }
      stock_cycle_data: {
        Row: {
          created_at: string
          id: string
          ordered_quantity: number | null
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity: number | null
          updated_at: string
          user_id: string
          visit_date: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ordered_quantity?: number | null
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity?: number | null
          updated_at?: string
          user_id: string
          visit_date: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ordered_quantity?: number | null
          product_id?: string
          product_name?: string
          retailer_id?: string
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string
          visit_date?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      user_approvals: {
        Row: {
          approval_level: number
          approved_at: string | null
          approver_id: string | null
          comments: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["approval_status"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_level: number
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_level?: number
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invitation_token: string
          manager_id: string | null
          phone_number: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          invitation_token: string
          manager_id?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invitation_token?: string
          manager_id?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_approved?: boolean
          name: string
          region_pincodes?: string[]
          skills?: string[]
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_approved?: boolean
          name?: string
          region_pincodes?: string[]
          skills?: string[]
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          check_in_address: string | null
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_address: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string
          id: string
          location_match_in: boolean | null
          location_match_out: boolean | null
          no_order_reason: string | null
          planned_date: string
          retailer_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          location_match_in?: boolean | null
          location_match_out?: boolean | null
          no_order_reason?: string | null
          planned_date: string
          retailer_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          location_match_in?: boolean | null
          location_match_out?: boolean | null
          no_order_reason?: string | null
          planned_date?: string
          retailer_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_approval_workflow: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      get_authenticated_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_basic_profiles_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      send_notification: {
        Args: {
          message_param: string
          related_id_param?: string
          related_table_param?: string
          title_param: string
          type_param?: string
          user_id_param: string
        }
        Returns: string
      }
      update_security_info: {
        Args: { new_hint_answer: string; new_hint_question: string }
        Returns: boolean
      }
      verify_hint_answer: {
        Args: { submitted_answer: string; user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_status: "pending" | "approved" | "rejected"
      branding_status:
        | "submitted"
        | "manager_approved"
        | "manager_rejected"
        | "assigned"
        | "in_progress"
        | "executed"
        | "verified"
      employee_doc_type: "address_proof" | "id_proof" | "other"
      user_status:
        | "pending_completion"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "active"
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
      app_role: ["admin", "user"],
      approval_status: ["pending", "approved", "rejected"],
      branding_status: [
        "submitted",
        "manager_approved",
        "manager_rejected",
        "assigned",
        "in_progress",
        "executed",
        "verified",
      ],
      employee_doc_type: ["address_proof", "id_proof", "other"],
      user_status: [
        "pending_completion",
        "pending_approval",
        "approved",
        "rejected",
        "active",
      ],
    },
  },
} as const
