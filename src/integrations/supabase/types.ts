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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"]
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          admin_role: Database["public"]["Enums"]["admin_role"]
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"]
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          condition_id: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          interventions: string[] | null
          notes: string | null
          outcomes: Json | null
          patient_id: string | null
          satisfaction_score: number | null
          session_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          condition_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interventions?: string[] | null
          notes?: string | null
          outcomes?: Json | null
          patient_id?: string | null
          satisfaction_score?: number | null
          session_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          condition_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interventions?: string[] | null
          notes?: string | null
          outcomes?: Json | null
          patient_id?: string | null
          satisfaction_score?: number | null
          session_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_sessions_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_tools: {
        Row: {
          condition_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          interpretation_guide: Json | null
          name: string
          psychometric_properties: Json | null
          reference_values: Json | null
          scoring_method: string | null
          tool_type: string | null
          updated_at: string
        }
        Insert: {
          condition_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          interpretation_guide?: Json | null
          name: string
          psychometric_properties?: Json | null
          reference_values?: Json | null
          scoring_method?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Update: {
          condition_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          interpretation_guide?: Json | null
          name?: string
          psychometric_properties?: Json | null
          reference_values?: Json | null
          scoring_method?: string | null
          tool_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          context: string | null
          created_at: string
          id: string
          messages: Json
          response: string
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          messages: Json
          response: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          messages?: Json
          response?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      collaboration_shared_protocols: {
        Row: {
          access_level: string
          created_at: string
          id: string
          is_public: boolean | null
          protocol_id: string
          shared_by: string
          shared_with: string | null
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          protocol_id: string
          shared_by: string
          shared_with?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          protocol_id?: string
          shared_by?: string
          shared_with?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_shared_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "treatment_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          category: Database["public"]["Enums"]["condition_category"]
          created_at: string
          description: string | null
          icd_codes: string[] | null
          id: string
          keywords: string[] | null
          name: string
          prevalence_data: Json | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["condition_category"]
          created_at?: string
          description?: string | null
          icd_codes?: string[] | null
          id?: string
          keywords?: string[] | null
          name: string
          prevalence_data?: Json | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["condition_category"]
          created_at?: string
          description?: string | null
          icd_codes?: string[] | null
          id?: string
          keywords?: string[] | null
          name?: string
          prevalence_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      cpd_activities: {
        Row: {
          activity_type: string
          certificate_url: string | null
          cpd_points: number | null
          created_at: string
          date_completed: string
          description: string | null
          hours_claimed: number
          id: string
          notes: string | null
          provider: string | null
          title: string
          updated_at: string
          user_id: string
          verification_method: string | null
        }
        Insert: {
          activity_type: string
          certificate_url?: string | null
          cpd_points?: number | null
          created_at?: string
          date_completed: string
          description?: string | null
          hours_claimed: number
          id?: string
          notes?: string | null
          provider?: string | null
          title: string
          updated_at?: string
          user_id: string
          verification_method?: string | null
        }
        Update: {
          activity_type?: string
          certificate_url?: string | null
          cpd_points?: number | null
          created_at?: string
          date_completed?: string
          description?: string | null
          hours_claimed?: number
          id?: string
          notes?: string | null
          provider?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          verification_method?: string | null
        }
        Relationships: []
      }
      evidence: {
        Row: {
          abstract: string | null
          authors: string[] | null
          clinical_implications: string | null
          condition_ids: string[] | null
          created_at: string
          doi: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"] | null
          grade_assessment: Json | null
          id: string
          is_active: boolean | null
          journal: string | null
          key_findings: string | null
          pmid: string | null
          publication_date: string | null
          study_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          clinical_implications?: string | null
          condition_ids?: string[] | null
          created_at?: string
          doi?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          grade_assessment?: Json | null
          id?: string
          is_active?: boolean | null
          journal?: string | null
          key_findings?: string | null
          pmid?: string | null
          publication_date?: string | null
          study_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          clinical_implications?: string | null
          condition_ids?: string[] | null
          created_at?: string
          doi?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          grade_assessment?: Json | null
          id?: string
          is_active?: boolean | null
          journal?: string | null
          key_findings?: string | null
          pmid?: string | null
          publication_date?: string | null
          study_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      evidence_access_logs: {
        Row: {
          action_type: string
          created_at: string
          evidence_id: string | null
          id: string
          search_query: string | null
          user_id: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          evidence_id?: string | null
          id?: string
          search_query?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          evidence_id?: string | null
          id?: string
          search_query?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_for_patient_access: boolean | null
          created_at: string
          department: string | null
          first_name: string | null
          healthcare_role: Database["public"]["Enums"]["healthcare_role"] | null
          id: string
          last_name: string | null
          license_expiry_date: string | null
          license_number: string | null
          license_verified: boolean | null
          professional_title: string | null
          registration_number: string | null
          specialization: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_for_patient_access?: boolean | null
          created_at?: string
          department?: string | null
          first_name?: string | null
          healthcare_role?:
            | Database["public"]["Enums"]["healthcare_role"]
            | null
          id?: string
          last_name?: string | null
          license_expiry_date?: string | null
          license_number?: string | null
          license_verified?: boolean | null
          professional_title?: string | null
          registration_number?: string | null
          specialization?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_for_patient_access?: boolean | null
          created_at?: string
          department?: string | null
          first_name?: string | null
          healthcare_role?:
            | Database["public"]["Enums"]["healthcare_role"]
            | null
          id?: string
          last_name?: string | null
          license_expiry_date?: string | null
          license_number?: string | null
          license_verified?: boolean | null
          professional_title?: string | null
          registration_number?: string | null
          specialization?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protocol_reviews: {
        Row: {
          created_at: string
          id: string
          protocol_id: string
          rating: number | null
          recommendations: string | null
          review_text: string | null
          reviewer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          protocol_id: string
          rating?: number | null
          recommendations?: string | null
          review_text?: string | null
          reviewer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          protocol_id?: string
          rating?: number | null
          recommendations?: string | null
          review_text?: string | null
          reviewer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_reviews_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "treatment_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string
          role: string
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          max_members: number | null
          meeting_schedule: Json | null
          name: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          meeting_schedule?: Json | null
          name: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          meeting_schedule?: Json | null
          name?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      treatment_protocols: {
        Row: {
          condition_id: string | null
          contraindications: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_weeks: number | null
          evidence_ids: string[] | null
          expected_outcomes: string | null
          frequency_per_week: number | null
          id: string
          is_validated: boolean | null
          name: string
          precautions: string[] | null
          protocol_steps: Json | null
          updated_at: string
        }
        Insert: {
          condition_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          evidence_ids?: string[] | null
          expected_outcomes?: string | null
          frequency_per_week?: number | null
          id?: string
          is_validated?: boolean | null
          name: string
          precautions?: string[] | null
          protocol_steps?: Json | null
          updated_at?: string
        }
        Update: {
          condition_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          evidence_ids?: string[] | null
          expected_outcomes?: string | null
          frequency_per_week?: number | null
          id?: string
          is_validated?: boolean | null
          name?: string
          precautions?: string[] | null
          protocol_steps?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_protocols_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_protocols_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_activity_stats: {
        Row: {
          activity_date: string
          assessments_completed: number | null
          collaboration_interactions: number | null
          cpd_activities: number | null
          created_at: string
          evidence_searches: number | null
          evidence_views: number | null
          id: string
          logins_count: number | null
          protocols_created: number | null
          protocols_shared: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          assessments_completed?: number | null
          collaboration_interactions?: number | null
          cpd_activities?: number | null
          created_at?: string
          evidence_searches?: number | null
          evidence_views?: number | null
          id?: string
          logins_count?: number | null
          protocols_created?: number | null
          protocols_shared?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          assessments_completed?: number | null
          collaboration_interactions?: number | null
          cpd_activities?: number | null
          created_at?: string
          evidence_searches?: number | null
          evidence_views?: number | null
          id?: string
          logins_count?: number | null
          protocols_created?: number | null
          protocols_shared?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          display_preferences: Json | null
          id: string
          notification_settings: Json | null
          preferred_conditions: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_preferences?: Json | null
          id?: string
          notification_settings?: Json | null
          preferred_conditions?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_preferences?: Json | null
          id?: string
          notification_settings?: Json | null
          preferred_conditions?: string[] | null
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
      approve_patient_access: {
        Args: { approved?: boolean; target_user_id: string }
        Returns: boolean
      }
      assign_patient_to_therapist: {
        Args: {
          assignment_reason?: string
          patient_id: string
          therapist_id: string
        }
        Returns: boolean
      }
      audit_security_event: {
        Args: { details?: Json; event_type: string; user_id?: string }
        Returns: undefined
      }
      check_password_strength: { Args: { password: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          max_attempts?: number
          operation_type: string
          user_id?: string
          window_minutes?: number
        }
        Returns: boolean
      }
      get_security_headers: { Args: never; Returns: Json }
      get_user_healthcare_status: {
        Args: never
        Returns: {
          approved_for_access: boolean
          healthcare_role: string
          is_verified: boolean
          license_verified: boolean
        }[]
      }
      is_admin: { Args: { user_id?: string }; Returns: boolean }
      is_verified_admin: { Args: { user_id?: string }; Returns: boolean }
      secure_assign_healthcare_role: {
        Args: {
          department?: string
          license_number?: string
          new_role: Database["public"]["Enums"]["healthcare_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      update_subscription_analytics: { Args: never; Returns: undefined }
      update_user_activity_stat: {
        Args: { increment_value?: number; stat_type: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "moderator"
      condition_category:
        | "msk"
        | "neurological"
        | "respiratory"
        | "rheumatology"
      evidence_level: "A" | "B" | "C" | "D"
      healthcare_role:
        | "physiotherapist"
        | "doctor"
        | "nurse"
        | "occupational_therapist"
        | "speech_therapist"
        | "admin"
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
      admin_role: ["super_admin", "admin", "moderator"],
      condition_category: [
        "msk",
        "neurological",
        "respiratory",
        "rheumatology",
      ],
      evidence_level: ["A", "B", "C", "D"],
      healthcare_role: [
        "physiotherapist",
        "doctor",
        "nurse",
        "occupational_therapist",
        "speech_therapist",
        "admin",
      ],
    },
  },
} as const
