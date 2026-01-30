export type AppRole = 'admin' | 'student';
export type BookStatus = 'processing' | 'ready' | 'error';

export interface Profile {
  id: string;
  name: string;
  grade_level: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  grade_level: number;
  cover_url: string | null;
  pdf_url: string | null;
  page_count: number;
  status: BookStatus;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookPage {
  id: string;
  book_id: string;
  page_number: number;
  image_url: string;
  text_content: string | null;
  created_at: string;
}

export interface ReadingProgress {
  id: string;
  student_id: string;
  book_id: string;
  current_page: number;
  completed: boolean;
  last_read_at: string;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface BookWithProgress extends Book {
  reading_progress?: ReadingProgress | null;
}

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
  11: 'Grade 11',
  12: 'Grade 12',
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
