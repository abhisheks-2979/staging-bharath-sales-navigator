export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
      attendance: {
        Row: {
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
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
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
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
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
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
          retailer_name?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
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
          scheme_type: string
          start_date: string | null
          updated_at: string
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
          scheme_type?: string
          start_date?: string | null
          updated_at?: string
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
          scheme_type?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_schemes_product_id_fkey"
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
          phone_number: string | null
          recovery_email: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          phone_number?: string | null
          recovery_email?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          hint_answer?: string
          hint_question?: string
          id?: string
          phone_number?: string | null
          recovery_email?: string | null
          updated_at?: string
          username?: string
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
          category: string | null
          competitors: string[] | null
          created_at: string
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
          category?: string | null
          competitors?: string[] | null
          created_at?: string
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
          category?: string | null
          competitors?: string[] | null
          created_at?: string
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
          potential?: string | null
          priority?: string | null
          retail_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
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
      visits: {
        Row: {
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string
          id: string
          location_match_in: boolean | null
          location_match_out: boolean | null
          planned_date: string
          retailer_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          location_match_in?: boolean | null
          location_match_out?: boolean | null
          planned_date: string
          retailer_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          location_match_in?: boolean | null
          location_match_out?: boolean | null
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      verify_hint_answer: {
        Args: { user_email: string; submitted_answer: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
