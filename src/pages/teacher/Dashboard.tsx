import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { GradeFilter } from '@/components/teacher/GradeFilter';
import { TeacherBookGrid } from '@/components/teacher/TeacherBookGrid';
import { BookDetailsDialog } from '@/components/teacher/BookDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookWithProgress, GRADE_LABELS } from '@/types/database';
import { GraduationCap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeacherDashboard() {
  const { user, isTeacher, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedGrade, setSelectedGrade] = useState<number | null>(12);
  const [selectedBook, setSelectedBook] = useState<BookWithProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string>('all');

  // Fetch books
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['teacher-books'],
    queryFn: async (): Promise<BookWithProgress[]> => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'ready')
        .order('grade_level', { ascending: true });

      if (error) throw error;
      return ((data || []) as any) as BookWithProgress[];
    },
  });

  // Filter books by selected grade
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    let filtered = books;
    if (selectedGrade !== null) {
      filtered = filtered.filter((book) => book.grade_level === selectedGrade);
    }
    return filtered;
  }, [books, selectedGrade]);

  // Group books by grade and then by subject for organized display
  const booksByGrade = useMemo(() => {
    const grouped: Record<number, Record<string, BookWithProgress[]>> = {};
    if (!filteredBooks) return grouped;
    filteredBooks.forEach((book) => {
      const grade = book.grade_level;
      const subject = book.subject || 'Uncategorized';

      if (!grouped[grade]) {
        grouped[grade] = {};
      }
      if (!grouped[grade][subject]) {
        grouped[grade][subject] = [];
      }
      grouped[grade][subject].push(book);
    });
    return grouped;
  }, [filteredBooks]);

  // Get unique subjects for the active selection
  const subjectsInActiveGrade = useMemo(() => {
    const subjects = new Set<string>();
    filteredBooks.forEach(b => subjects.add(b.subject || 'Uncategorized'));
    return Array.from(subjects).sort();
  }, [filteredBooks]);

  const finalQuipperBooks = useMemo(() => {
    return [];
  }, []);

  const handleBookClick = (book: BookWithProgress) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  // Redirect if not authenticated or not a teacher/admin
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (!authLoading && !isTeacher && !isAdmin) {
    navigate('/bookshelf');
    return null;
  }

  const isLoading = booksLoading;

  return (
    <TeacherLayout>
      <div className="space-y-6 -mt-4">
        {/* Global Grade Filter & Source Select */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Internal Library
          </h2>
        </div>

        {true ? (
          <Card className="border-none shadow-playful overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 font-display">
                <GraduationCap className="w-5 h-5 text-primary" />
                Select Grade Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => {
                  const isSelected = selectedGrade === grade;
                  return (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(isSelected ? null : grade)}
                      className={cn(
                        "h-12 min-w-[80px] rounded-xl text-sm font-semibold transition-all shadow-sm border flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary scale-105"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                      )}
                    >
                      {GRADE_LABELS[grade]}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedGrade(null)}
                  className={cn(
                    "h-12 min-w-[80px] rounded-xl text-sm font-semibold transition-all shadow-sm border flex items-center justify-center flex-shrink-0",
                    selectedGrade === null
                      ? "bg-slate-800 text-white border-slate-800 scale-105"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  All Grades
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Books Display */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : selectedGrade === null ? (
          // Show all books in a single folder-like view when no filter
          <div className="space-y-12">
            <h3 className="text-xl font-display font-semibold">
              All Books ({filteredBooks.length})
            </h3>

            {/* Flatten the nested structure for the "All Books" view but still group by Subject for clarity */}
            {Object.entries(
              filteredBooks.reduce((acc, book) => {
                const subj = book.subject || 'Uncategorized';
                if (!acc[subj]) acc[subj] = [];
                acc[subj].push(book);
                return acc;
              }, {} as Record<string, BookWithProgress[]>)
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([subj, subjBooks]) => (
                <div key={subj} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary/60" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-700">{subj}</h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {subjBooks.length} Books
                    </span>
                  </div>
                  <TeacherBookGrid
                    books={subjBooks}
                    onBookClick={handleBookClick}
                    showSearch={subj === Object.keys(booksByGrade)[0]} // Only show search once if needed
                    emptyMessage="No books available in the library"
                  />
                </div>
              ))}
          </div>
        ) : (
          // Show books grouped by grade and subject when filtered
          <div className="space-y-12">
            {Object.entries(booksByGrade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, subjects]) => (
                <div key={grade} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-display font-bold text-gradient whitespace-nowrap">
                      {GRADE_LABELS[Number(grade)]}
                    </h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  <div className="space-y-12 pl-4 border-l-2 border-slate-50">
                    {Object.entries(subjects)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([subj, subjBooks]) => (
                        <div key={subj} className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-primary/60" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-700">{subj}</h4>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              {subjBooks.length} Books
                            </span>
                          </div>
                          <TeacherBookGrid
                            books={subjBooks}
                            onBookClick={handleBookClick}
                            showSearch={false}
                            emptyMessage="No books for this subject"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Book Details Dialog */}
      <BookDetailsDialog
        book={selectedBook}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </TeacherLayout>
  );
}
