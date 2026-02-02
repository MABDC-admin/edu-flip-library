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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          label: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          label: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          label?: string
          start_date?: string | null
        }
        Relationships: []
      }
      book_annotations: {
        Row: {
          book_id: string
          content: Json
          created_at: string
          id: string
          page_number: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          content: Json
          created_at?: string
          id?: string
          page_number: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          content?: Json
          created_at?: string
          id?: string
          page_number?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_annotations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_pages: {
        Row: {
          book_id: string
          created_at: string
          id: string
          image_url: string
          page_number: number
          svg_url: string | null
          text_content: string | null
          thumbnail_url: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          image_url: string
          page_number: number
          svg_url?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          image_url?: string
          page_number?: number
          svg_url?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          cover_url: string | null
          created_at: string
          grade_level: number
          html5_url: string | null
          id: string
          is_teacher_only: boolean
          page_count: number | null
          pdf_url: string | null
          school_id: string | null
          source: string
          status: Database["public"]["Enums"]["book_status"]
          subject: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          grade_level: number
          html5_url?: string | null
          id?: string
          is_teacher_only?: boolean
          page_count?: number | null
          pdf_url?: string | null
          school_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["book_status"]
          subject?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          grade_level?: number
          html5_url?: string | null
          id?: string
          is_teacher_only?: boolean
          page_count?: number | null
          pdf_url?: string | null
          school_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["book_status"]
          subject?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string
          created_at: string
          id: string
          room: string | null
          schedule: string | null
          school_id: string
          section_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          id?: string
          room?: string | null
          schedule?: string | null
          school_id: string
          section_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          id?: string
          room?: string | null
          schedule?: string | null
          school_id?: string
          section_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          academic_year_id: string
          created_at: string
          form_data: Json
          form_name: string
          id: string
          profile_id: string | null
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          form_data: Json
          form_name: string
          id?: string
          profile_id?: string | null
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          form_data?: Json
          form_name?: string
          id?: string
          profile_id?: string | null
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          id: string
          initial_grade: number | null
          performance_tasks_score: number | null
          performance_tasks_total: number | null
          quarterly_assessment_score: number | null
          quarterly_assessment_total: number | null
          quarter: number
          school_id: string
          student_id: string
          transmuted_grade: number | null
          updated_at: string
          written_works_score: number | null
          written_works_total: number | null
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          id?: string
          initial_grade?: number | null
          performance_tasks_score?: number | null
          performance_tasks_total?: number | null
          quarterly_assessment_score?: number | null
          quarterly_assessment_total?: number | null
          quarter: number
          school_id: string
          student_id: string
          transmuted_grade?: number | null
          updated_at?: string
          written_works_score?: number | null
          written_works_total?: number | null
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          id?: string
          initial_grade?: number | null
          performance_tasks_score?: number | null
          performance_tasks_total?: number | null
          quarterly_assessment_score?: number | null
          quarterly_assessment_total?: number | null
          quarter?: number
          school_id?: string
          student_id?: string
          transmuted_grade?: number | null
          updated_at?: string
          written_works_score?: number | null
          written_works_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_year_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          grade_level: number | null
          id: string
          name: string
          qr_code_data: string | null
          school_id: string | null
          student_id_display: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          grade_level?: number | null
          id: string
          name: string
          qr_code_data?: string | null
          school_id?: string | null
          student_id_display?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          grade_level?: number | null
          id?: string
          name?: string
          qr_code_data?: string | null
          school_id?: string | null
          student_id_display?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          completed: boolean
          created_at: string
          current_page: number
          id: string
          last_read_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          completed?: boolean
          created_at?: string
          current_page?: number
          id?: string
          last_read_at?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          completed?: boolean
          created_at?: string
          current_page?: number
          id?: string
          last_read_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          short_name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          short_name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string
          slug?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          academic_year_id: string
          adviser_id: string | null
          created_at: string
          grade_level: number
          id: string
          name: string
          school_id: string
        }
        Insert: {
          academic_year_id: string
          adviser_id?: string | null
          created_at?: string
          grade_level: number
          id?: string
          name: string
          school_id: string
        }
        Update: {
          academic_year_id?: string
          adviser_id?: string | null
          created_at?: string
          grade_level?: number
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sections: {
        Row: {
          academic_year_id: string
          created_at: string
          id: string
          school_id: string
          section_id: string
          student_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          id?: string
          school_id: string
          section_id: string
          student_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          id?: string
          school_id?: string
          section_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sections_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_id_sequences: {
        Row: {
          academic_year_id: string | null
          current_val: number
          id: string
          school_id: string | null
        }
        Insert: {
          academic_year_id?: string | null
          current_val?: number
          id?: string
          school_id?: string | null
        }
        Update: {
          academic_year_id?: string | null
          current_val?: number
          id?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_id_sequences_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_id_sequences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          grade_level: number
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          grade_level: number
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          grade_level?: number
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assigned_books: {
        Row: {
          assigned_at: string
          book_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          book_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          book_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assigned_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          academic_year_id: string | null
          check_in_time: string
          id: string
          profile_id: string | null
          school_id: string | null
          status: string
        }
        Insert: {
          academic_year_id?: string | null
          check_in_time?: string
          id?: string
          profile_id?: string | null
          school_id?: string | null
          status?: string
        }
        Update: {
          academic_year_id?: string | null
          check_in_time?: string
          id?: string
          profile_id?: string | null
          school_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_book: {
        Args: {
          _book_id: string
        }
        Returns: boolean
      }
      generate_student_id: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_next_student_id: {
        Args: {
          p_school_id: string
          p_academic_year_id: string
        }
        Returns: string
      }
      is_admin: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      is_privileged: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      is_teacher: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher"
      book_status: "processing" | "ready" | "error"
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
      app_role: ["admin", "student", "teacher"],
      book_status: ["processing", "ready", "error"],
    },
  },
} as const