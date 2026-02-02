export type AppRole = 'admin' | 'student' | 'teacher';
export type BookStatus = 'processing' | 'ready' | 'error';

export interface School {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  grade_level: number | null;
  avatar_url: string | null;
  email?: string | null;
  school_id: string | null;
  academic_year_id: string | null;
  student_id_display: string | null;
  qr_code_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  school_id: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  grade_level: number;
  subject?: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  page_count: number;
  source: 'internal' | 'quipper';
  is_teacher_only: boolean;
  status: BookStatus;
  uploaded_by: string | null;
  school_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookPage {
  id: string;
  book_id: string;
  page_number: number;
  image_url: string;
  svg_url?: string | null;
  thumbnail_url?: string | null;
  text_content: string | null;
  created_at: string;
}

// Extended types with relations
// BookWithProgress will be extended with progress data when implemented
export type BookWithProgress = Book;

export interface BookWithPages extends Book {
  book_pages: BookPage[];
}

// Grade level helpers
export const GRADE_LABELS: Record<number, string> = {
  1: 'Grade 1',
  2: 'Grade 2',
  3: 'Grade 3',
  4: 'Grade 4',
  5: 'Grade 5',
  6: 'Grade 6',
  7: 'Grade 7',
  8: 'Grade 8',
  9: 'Grade 9',
  10: 'Grade 10',
  11: 'Senior High',
  12: 'Senior High',
};

export const GRADE_COLORS: Record<number, string> = {
  1: 'bg-grade-1',
  2: 'bg-grade-2',
  3: 'bg-grade-3',
  4: 'bg-grade-4',
  5: 'bg-grade-5',
  6: 'bg-grade-6',
  7: 'bg-grade-7',
  8: 'bg-grade-8',
  9: 'bg-grade-9',
  10: 'bg-grade-10',
  11: 'bg-grade-11',
  12: 'bg-grade-12',
};

export const SUBJECT_LABELS = [
  'Math',
  'Science',
  'English',
  'Filipino',
  'Araling Panlipunan',
  'MAPEH',
  'TLE',
  'ESP',
  'Computer',
  'Other'
] as const;
