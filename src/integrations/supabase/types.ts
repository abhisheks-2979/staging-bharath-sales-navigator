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
          face_match_confidence: number | null
          face_verification_status: string | null
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
          face_match_confidence?: number | null
          face_verification_status?: string | null
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
          face_match_confidence?: number | null
          face_verification_status?: string | null
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
      beats: {
        Row: {
          average_km: number | null
          average_time_minutes: number | null
          beat_id: string
          beat_name: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          travel_allowance: number | null
          updated_at: string
        }
        Insert: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id: string
          beat_name: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          travel_allowance?: number | null
          updated_at?: string
        }
        Update: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id?: string
          beat_name?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          travel_allowance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      branding_request_items: {
        Row: {
          approved_budget: number | null
          asset_type: string
          branding_request_id: string | null
          created_at: string
          current_stage: string | null
          due_date: string | null
          id: string
          pending_status: string | null
          preferred_vendor: string | null
          updated_at: string
          vendor_budget: number | null
          vendor_confirmation_status: string | null
        }
        Insert: {
          approved_budget?: number | null
          asset_type: string
          branding_request_id?: string | null
          created_at?: string
          current_stage?: string | null
          due_date?: string | null
          id?: string
          pending_status?: string | null
          preferred_vendor?: string | null
          updated_at?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
        }
        Update: {
          approved_budget?: number | null
          asset_type?: string
          branding_request_id?: string | null
          created_at?: string
          current_stage?: string | null
          due_date?: string | null
          id?: string
          pending_status?: string | null
          preferred_vendor?: string | null
          updated_at?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_request_items_branding_request_id_fkey"
            columns: ["branding_request_id"]
            isOneToOne: false
            referencedRelation: "branding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_requests: {
        Row: {
          approved_at: string | null
          assigned_vendor_id: string | null
          budget: number | null
          contract_document_url: string | null
          created_at: string
          description: string | null
          due_date: string | null
          executed_at: string | null
          id: string
          implementation_date: string | null
          implementation_photo_urls: string[] | null
          manager_comments: string | null
          manager_id: string | null
          measurement_photo_urls: string[] | null
          order_impact_notes: string | null
          pincode: string | null
          post_implementation_notes: string | null
          procurement_id: string | null
          requested_assets: string | null
          retailer_feedback_on_branding: string | null
          retailer_id: string
          size: string | null
          status: Database["public"]["Enums"]["branding_status"]
          title: string | null
          updated_at: string
          user_id: string
          vendor_budget: number | null
          vendor_confirmation_status: string | null
          vendor_due_date: string | null
          vendor_feedback: string | null
          vendor_rating: number | null
          verification_photo_url: string | null
          visit_id: string
        }
        Insert: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          contract_document_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          implementation_date?: string | null
          implementation_photo_urls?: string[] | null
          manager_comments?: string | null
          manager_id?: string | null
          measurement_photo_urls?: string[] | null
          order_impact_notes?: string | null
          pincode?: string | null
          post_implementation_notes?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_feedback_on_branding?: string | null
          retailer_id: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
          vendor_due_date?: string | null
          vendor_feedback?: string | null
          vendor_rating?: number | null
          verification_photo_url?: string | null
          visit_id: string
        }
        Update: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          contract_document_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          implementation_date?: string | null
          implementation_photo_urls?: string[] | null
          manager_comments?: string | null
          manager_id?: string | null
          measurement_photo_urls?: string[] | null
          order_impact_notes?: string | null
          pincode?: string | null
          post_implementation_notes?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_feedback_on_branding?: string | null
          retailer_id?: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
          vendor_due_date?: string | null
          vendor_feedback?: string | null
          vendor_rating?: number | null
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
      competencies: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          level_definitions: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          level_definitions?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          level_definitions?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      competition_insights: {
        Row: {
          action_required: boolean | null
          additional_notes: string | null
          category: string | null
          competitor_image_url: string
          competitor_name: string
          created_at: string
          description: string
          id: string
          impact_level: string | null
          insight_type: string
          location_info: string | null
          price_info: string | null
          product_category: string | null
          product_details: string | null
          retailer_id: string
          shelf_space: string | null
          updated_at: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          action_required?: boolean | null
          additional_notes?: string | null
          category?: string | null
          competitor_image_url?: string
          competitor_name: string
          created_at?: string
          description: string
          id?: string
          impact_level?: string | null
          insight_type: string
          location_info?: string | null
          price_info?: string | null
          product_category?: string | null
          product_details?: string | null
          retailer_id: string
          shelf_space?: string | null
          updated_at?: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          action_required?: boolean | null
          additional_notes?: string | null
          category?: string | null
          competitor_image_url?: string
          competitor_name?: string
          created_at?: string
          description?: string
          id?: string
          impact_level?: string | null
          insight_type?: string
          location_info?: string | null
          price_info?: string | null
          product_category?: string | null
          product_details?: string | null
          retailer_id?: string
          shelf_space?: string | null
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      distributor_item_mappings: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string
          id: string
          mapping_id: string
          product_id: string | null
          product_name: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          id?: string
          mapping_id: string
          product_id?: string | null
          product_name?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          id?: string
          mapping_id?: string
          product_id?: string | null
          product_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_item_mappings_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "distributor_retailer_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_retailer_mappings: {
        Row: {
          created_at: string
          distributor_id: string
          id: string
          mapping_type: string
          retailer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distributor_id: string
          id?: string
          mapping_type?: string
          retailer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distributor_id?: string
          id?: string
          mapping_type?: string
          retailer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      distributors: {
        Row: {
          address: string | null
          contact_person: string
          created_at: string
          credit_limit: number | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          outstanding_amount: number | null
          parent_id: string | null
          parent_type: string | null
          phone: string
          status: string
          territory_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person: string
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          outstanding_amount?: number | null
          parent_id?: string | null
          parent_type?: string | null
          phone: string
          status?: string
          territory_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          outstanding_amount?: number | null
          parent_id?: string | null
          parent_type?: string | null
          phone?: string
          status?: string
          territory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributors_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributors_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_name: string
          badge_type: string
          created_at: string
          id: string
          issued_at: string
          issued_by: string | null
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name: string
          badge_type: string
          created_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name?: string
          badge_type?: string
          created_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employee_competencies: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          competency_id: string
          created_at: string
          current_level: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          competency_id: string
          created_at?: string
          current_level: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          competency_id?: string
          created_at?: string
          current_level?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_connections: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
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
      employee_recommendations: {
        Row: {
          created_at: string
          id: string
          recommendation_text: string
          recommender_id: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recommendation_text: string
          recommender_id: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recommendation_text?: string
          recommender_id?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          aadhar_document_url: string | null
          address: string | null
          alternate_email: string | null
          certifications: Json | null
          created_at: string
          daily_da_allowance: number
          date_of_exit: string | null
          date_of_joining: string | null
          education: string | null
          education_background: Json | null
          emergency_contact_number: string | null
          expertise_areas: string[] | null
          hq: string | null
          manager_id: string | null
          monthly_salary: number
          pan_document_url: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhar_document_url?: string | null
          address?: string | null
          alternate_email?: string | null
          certifications?: Json | null
          created_at?: string
          daily_da_allowance?: number
          date_of_exit?: string | null
          date_of_joining?: string | null
          education?: string | null
          education_background?: Json | null
          emergency_contact_number?: string | null
          expertise_areas?: string[] | null
          hq?: string | null
          manager_id?: string | null
          monthly_salary?: number
          pan_document_url?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhar_document_url?: string | null
          address?: string | null
          alternate_email?: string | null
          certifications?: Json | null
          created_at?: string
          daily_da_allowance?: number
          date_of_exit?: string | null
          date_of_joining?: string | null
          education?: string | null
          education_background?: Json | null
          emergency_contact_number?: string | null
          expertise_areas?: string[] | null
          hq?: string | null
          manager_id?: string | null
          monthly_salary?: number
          pan_document_url?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gps_tracking: {
        Row: {
          accuracy: number | null
          created_at: string
          date: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          date?: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          date?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      gps_tracking_stops: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string
          stopped_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          reason: string
          stopped_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string
          stopped_at?: string
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
          credit_paid_amount: number | null
          credit_pending_amount: number | null
          discount_amount: number | null
          distributor_id: string | null
          distributor_name: string | null
          id: string
          is_credit_order: boolean | null
          previous_pending_cleared: number | null
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
          credit_paid_amount?: number | null
          credit_pending_amount?: number | null
          discount_amount?: number | null
          distributor_id?: string | null
          distributor_name?: string | null
          id?: string
          is_credit_order?: boolean | null
          previous_pending_cleared?: number | null
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
          credit_paid_amount?: number | null
          credit_pending_amount?: number | null
          discount_amount?: number | null
          distributor_id?: string | null
          distributor_name?: string | null
          id?: string
          is_credit_order?: boolean | null
          previous_pending_cleared?: number | null
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
          bundle_discount_amount: number | null
          bundle_discount_percentage: number | null
          bundle_product_ids: string[] | null
          buy_quantity: number | null
          category_id: string | null
          condition_quantity: number | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          free_product_id: string | null
          free_quantity: number | null
          id: string
          is_active: boolean | null
          is_first_order_only: boolean | null
          min_order_value: number | null
          name: string
          product_id: string | null
          quantity_condition_type: string | null
          scheme_type: string
          start_date: string | null
          tier_data: Json | null
          updated_at: string
          validity_days: number | null
          variant_id: string | null
        }
        Insert: {
          bundle_discount_amount?: number | null
          bundle_discount_percentage?: number | null
          bundle_product_ids?: string[] | null
          buy_quantity?: number | null
          category_id?: string | null
          condition_quantity?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          free_product_id?: string | null
          free_quantity?: number | null
          id?: string
          is_active?: boolean | null
          is_first_order_only?: boolean | null
          min_order_value?: number | null
          name: string
          product_id?: string | null
          quantity_condition_type?: string | null
          scheme_type?: string
          start_date?: string | null
          tier_data?: Json | null
          updated_at?: string
          validity_days?: number | null
          variant_id?: string | null
        }
        Update: {
          bundle_discount_amount?: number | null
          bundle_discount_percentage?: number | null
          bundle_product_ids?: string[] | null
          buy_quantity?: number | null
          category_id?: string | null
          condition_quantity?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          free_product_id?: string | null
          free_quantity?: number | null
          id?: string
          is_active?: boolean | null
          is_first_order_only?: boolean | null
          min_order_value?: number | null
          name?: string
          product_id?: string | null
          quantity_condition_type?: string | null
          scheme_type?: string
          start_date?: string | null
          tier_data?: Json | null
          updated_at?: string
          validity_days?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_schemes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_schemes_free_product_id_fkey"
            columns: ["free_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
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
          sku_image_url: string | null
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
          sku_image_url?: string | null
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
          sku_image_url?: string | null
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
          anniversary_date: string | null
          aspirations: string | null
          created_at: string
          current_address: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          facebook_url: string | null
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          instagram_url: string | null
          interests: string[] | null
          invitation_token: string | null
          learning_goals: string[] | null
          linkedin_url: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          permanent_address: string | null
          phone_number: string | null
          profile_picture_url: string | null
          recovery_email: string | null
          role_id: string | null
          territories_covered: string[] | null
          updated_at: string
          user_status: Database["public"]["Enums"]["user_status"] | null
          username: string
          work_location: string | null
        }
        Insert: {
          anniversary_date?: string | null
          aspirations?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_url?: string | null
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          instagram_url?: string | null
          interests?: string[] | null
          invitation_token?: string | null
          learning_goals?: string[] | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          permanent_address?: string | null
          phone_number?: string | null
          profile_picture_url?: string | null
          recovery_email?: string | null
          role_id?: string | null
          territories_covered?: string[] | null
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username: string
          work_location?: string | null
        }
        Update: {
          anniversary_date?: string | null
          aspirations?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_url?: string | null
          full_name?: string
          hint_answer?: string
          hint_question?: string
          id?: string
          instagram_url?: string | null
          interests?: string[] | null
          invitation_token?: string | null
          learning_goals?: string[] | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          permanent_address?: string | null
          phone_number?: string | null
          profile_picture_url?: string | null
          recovery_email?: string | null
          role_id?: string | null
          territories_covered?: string[] | null
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
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
          gst_number: string | null
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
          pending_amount: number | null
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
          gst_number?: string | null
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
          pending_amount?: number | null
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
          gst_number?: string | null
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
          pending_amount?: number | null
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
      role_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          required_competencies: Json | null
          responsibilities: string[] | null
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          required_competencies?: Json | null
          responsibilities?: string[] | null
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          required_competencies?: Json | null
          responsibilities?: string[] | null
          role_name?: string
          updated_at?: string
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
      support_requests: {
        Row: {
          created_at: string
          created_date: string
          description: string | null
          id: string
          resolution_notes: string | null
          resolved_by: string | null
          resolved_date: string | null
          status: string
          subject: string
          support_category: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_date?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          status?: string
          subject: string
          support_category: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_date?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          status?: string
          subject?: string
          support_category?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      territories: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          pincode_ranges: string[] | null
          region: string
          updated_at: string
          zone: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pincode_ranges?: string[] | null
          region: string
          updated_at?: string
          zone?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pincode_ranges?: string[] | null
          region?: string
          updated_at?: string
          zone?: string | null
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
          competitors: string[] | null
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
          competitors?: string[] | null
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
          competitors?: string[] | null
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
          skip_check_in_reason: string | null
          skip_check_in_time: string | null
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
          skip_check_in_reason?: string | null
          skip_check_in_time?: string | null
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
          skip_check_in_reason?: string | null
          skip_check_in_time?: string | null
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
      can_access_invitation: {
        Args: { _invitation_token: string }
        Returns: boolean
      }
      check_duplicate_competitor: {
        Args: { competitor_name_param: string }
        Returns: {
          competitor_id: string
          competitor_image_url: string
          competitor_name: string
          is_duplicate: boolean
          product_details: string
        }[]
      }
      create_approval_workflow: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      get_authenticated_email: { Args: never; Returns: string }
      get_basic_profiles_for_admin: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_limited_profiles_for_admin: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          user_status: Database["public"]["Enums"]["user_status"]
          username: string
        }[]
      }
      get_public_vendors: {
        Args: never
        Returns: {
          city: string
          created_at: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string
        }[]
      }
      get_territory_sales_summary: {
        Args: {
          end_date_param?: string
          start_date_param?: string
          territory_id_param: string
        }
        Returns: {
          total_orders: number
          total_retailers: number
          total_sales: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vendor_contact_info: {
        Args: { vendor_id: string }
        Returns: {
          city: string
          competitors: string[]
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          created_by: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string
          updated_at: string
        }[]
      }
      get_vendors_public_info: {
        Args: never
        Returns: {
          city: string
          created_at: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_hint_answer: { Args: { answer: string }; Returns: string }
      owns_completed_invitation: {
        Args: { _email: string; _user_id: string }
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
      update_security_info_secure: {
        Args: {
          new_hint_answer: string
          new_hint_question: string
          new_phone_number?: string
          new_recovery_email?: string
        }
        Returns: boolean
      }
      update_sensitive_profile_fields: {
        Args: {
          new_hint_answer?: string
          new_hint_question?: string
          new_phone_number?: string
          new_recovery_email?: string
        }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          full_name: string
          id: string
          manager_id: string
          phone_number: string
        }[]
      }
      verify_hint_answer: {
        Args: { submitted_answer: string; user_email: string }
        Returns: boolean
      }
      verify_hint_answer_secure: {
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
