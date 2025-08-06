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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
