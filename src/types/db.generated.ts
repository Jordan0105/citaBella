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
      appointment_services: {
        Row: {
          appointment_id: string
          currency: Database["public"]["Enums"]["currency_code"]
          discount: number
          duration_minutes: number
          id: string
          price: number
          service_id: string
        }
        Insert: {
          appointment_id: string
          currency: Database["public"]["Enums"]["currency_code"]
          discount?: number
          duration_minutes: number
          id?: string
          price: number
          service_id: string
        }
        Update: {
          appointment_id?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          discount?: number
          duration_minutes?: number
          id?: string
          price?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_service_revenue"
            referencedColumns: ["service_id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_end_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          discount: number
          employee_id: string
          ends_at: string
          exchange_rate: number | null
          id: string
          notes: string | null
          price: number
          service_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          actual_end_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          discount?: number
          employee_id: string
          ends_at: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          price: number
          service_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          actual_end_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          discount?: number
          employee_id?: string
          ends_at?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          price?: number
          service_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_revenue"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_revenue"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_service_revenue"
            referencedColumns: ["service_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          employee_id: string
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          weekday: number
        }
        Insert: {
          employee_id: string
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          weekday: number
        }
        Update: {
          employee_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_revenue"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          created_by: string | null
          employee_id: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_dates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_dates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_revenue"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          appointment_id: string
          base_amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          employee_amount: number
          employee_id: string
          employee_pct: number
          exchange_rate: number
          id: string
          owner_amount: number
          owner_pct: number
          service_id: string | null
        }
        Insert: {
          appointment_id: string
          base_amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          employee_amount: number
          employee_id: string
          employee_pct: number
          exchange_rate: number
          id?: string
          owner_amount: number
          owner_pct: number
          service_id?: string | null
        }
        Update: {
          appointment_id?: string
          base_amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          employee_amount?: number
          employee_id?: string
          employee_pct?: number
          exchange_rate?: number
          id?: string
          owner_amount?: number
          owner_pct?: number
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_revenue"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_service_revenue"
            referencedColumns: ["service_id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          exchange_rate_to_nio: number | null
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          exchange_rate_to_nio?: number | null
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          exchange_rate_to_nio?: number | null
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          avatar_url: string | null
          color: string
          commission_pct: number | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          color?: string
          commission_pct?: number | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string
          commission_pct?: number | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          description: string
          exchange_rate: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          spent_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          description: string
          exchange_rate: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          spent_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string
          exchange_rate?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          spent_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          appointment_id: string | null
          body: string | null
          client_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          phone: string
          provider: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          template_name: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          phone: string
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          phone?: string
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          exchange_rate: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          received_by: string | null
          tip: number
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          exchange_rate: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          tip?: number
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          exchange_rate?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          tip?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          commission_pct: number | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_nio: number
          price_usd: number
          updated_at: string
        }
        Insert: {
          commission_pct?: number | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_nio: number
          price_usd: number
          updated_at?: string
        }
        Update: {
          commission_pct?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_nio?: number
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_revenue"
            referencedColumns: ["employee_id"]
          },
        ]
      }
    }
    Views: {
      v_cash_close: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"] | null
          day: string | null
          expenses: number | null
          income: number | null
          method: Database["public"]["Enums"]["payment_method"] | null
          tips: number | null
        }
        Relationships: []
      }
      v_client_revenue: {
        Row: {
          client_id: string | null
          client_name: string | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          month: string | null
          spent: number | null
          visits: number | null
        }
        Relationships: []
      }
      v_daily_commissions: {
        Row: {
          appointments_qty: number | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          day: string | null
          employee_amount: number | null
          employee_id: string | null
          employee_name: string | null
          owner_amount: number | null
        }
        Relationships: []
      }
      v_daily_revenue: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"] | null
          day: string | null
          income: number | null
          tips: number | null
        }
        Relationships: []
      }
      v_employee_revenue: {
        Row: {
          appointments_qty: number | null
          commission: number | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          employee_id: string | null
          employee_name: string | null
          month: string | null
          revenue: number | null
        }
        Relationships: []
      }
      v_monthly_revenue: {
        Row: {
          commissions_owner: number | null
          commissions_worker: number | null
          currency: Database["public"]["Enums"]["currency_code"] | null
          expenses: number | null
          income: number | null
          month: string | null
          tips: number | null
        }
        Relationships: []
      }
      v_service_revenue: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"] | null
          month: string | null
          qty: number | null
          revenue: number | null
          service_id: string | null
          service_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason?: string }
        Returns: Json
      }
      complete_appointment: {
        Args: {
          p_appointment_id: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_tip?: number
        }
        Returns: Json
      }
      create_appointment_safe: { Args: { p_input: Json }; Returns: Json }
      fn_check_appointment_conflict: {
        Args: {
          p_employee: string
          p_end: string
          p_exclude?: string
          p_start: string
        }
        Returns: boolean
      }
      fn_current_employee_id: { Args: never; Returns: string }
      fn_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      fn_exchange_rate: { Args: never; Returns: number }
      fn_is_out_of_schedule: {
        Args: { p_employee: string; p_end: string; p_start: string }
        Returns: boolean
      }
      fn_setting: { Args: { p_key: string }; Returns: Json }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_end: string; p_start: string }
        Returns: Json
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      currency_code: "NIO" | "USD"
      expense_category:
        | "supplies"
        | "rent"
        | "utilities"
        | "salary_advance"
        | "marketing"
        | "other"
      payment_method: "cash" | "transfer" | "card"
      user_role: "owner" | "worker" | "receptionist"
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
      appointment_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      currency_code: ["NIO", "USD"],
      expense_category: [
        "supplies",
        "rent",
        "utilities",
        "salary_advance",
        "marketing",
        "other",
      ],
      payment_method: ["cash", "transfer", "card"],
      user_role: ["owner", "worker", "receptionist"],
    },
  },
} as const

