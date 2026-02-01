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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TeacherDashboard() {
  const { user, isTeacher, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookWithProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'all' | 'internal' | 'quipper'>('all');

  // Redirect if not authenticated or not a teacher/admin
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (!authLoading && !isTeacher && !isAdmin) {
    navigate('/bookshelf');
    return null;
  }

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

  // Filter books by selected grades
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    let filtered = books;
    if (selectedGrades.length > 0) {
      filtered = filtered.filter((book) => selectedGrades.includes(book.grade_level));
    }
    if (selectedSource !== 'all') {
      filtered = filtered.filter((book) => book.source === selectedSource);
    }
    return filtered;
  }, [books, selectedGrades, selectedSource]);

  // Group books by grade and then by subject for organized display
  const booksByGrade = useMemo(() => {
    const grouped: Record<number, Record<string, BookWithProgress[]>> = {};
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

  const handleBookClick = (book: BookWithProgress) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  const isLoading = booksLoading;

  return (
    <TeacherLayout>
      <div className="space-y-6 -mt-4">
        {/* Global Grade Filter & Source Select */}
        <Card className="border-none shadow-playful overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Switch Grade Level
            </CardTitle>

            <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">Source:</span>
              <Select
                value={selectedSource}
                onValueChange={(val: 'all' | 'internal' | 'quipper') => setSelectedSource(val)}
              >
                <SelectTrigger className="w-[130px] border-none bg-white font-medium h-7 rounded-lg text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="internal">Internal Library</SelectItem>
                  <SelectItem value="quipper">Quipper Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <GradeFilter
              selectedGrades={selectedGrades}
              onGradesChange={setSelectedGrades}
            />
          </CardContent>
        </Card>

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
        ) : selectedGrades.length === 0 ? (
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
