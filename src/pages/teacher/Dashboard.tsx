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
import { GraduationCap, BookOpen, ChevronRight, Folder } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function TeacherDashboard() {
  const { user, isTeacher, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookWithProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'internal' | 'quipper'>('internal');
  const [activeGrade, setActiveGrade] = useState<number>(1);
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

  // Filter books by selected grades
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    let filtered = books;
    if (selectedGrades.length > 0) {
      filtered = filtered.filter((book) => selectedGrades.includes(book.grade_level));
    }
    filtered = filtered.filter((book) => book.source === selectedSource);
    return filtered;
  }, [books, selectedGrades, selectedSource]);

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

  // Get unique subjects for the active grade (for Quipper view)
  const subjectsInActiveGrade = useMemo(() => {
    if (selectedSource !== 'quipper') return [];
    const subjects = new Set<string>();
    books?.filter(b => b.source === 'quipper' && b.grade_level === activeGrade)
      .forEach(b => subjects.add(b.subject || 'Uncategorized'));
    return Array.from(subjects).sort();
  }, [books, activeGrade, selectedSource]);

  const finalQuipperBooks = useMemo(() => {
    if (selectedSource !== 'quipper' || !books) return [];
    let filtered = books.filter(b => b.source === 'quipper' && b.grade_level === activeGrade);
    if (activeSubject !== 'all') {
      filtered = filtered.filter(b => (b.subject || 'Uncategorized') === activeSubject);
    }
    return filtered;
  }, [books, activeGrade, activeSubject, selectedSource]);

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
            {selectedSource === 'internal' ? 'Internal Library' : 'Quipper Content'}
          </h2>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">Browsing:</span>
            <Select
              value={selectedSource}
              onValueChange={(val: 'internal' | 'quipper') => setSelectedSource(val)}
            >
              <SelectTrigger className="w-[150px] border-none bg-slate-50 font-bold h-8 rounded-lg text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal Library</SelectItem>
                <SelectItem value="quipper">Quipper Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedSource === 'internal' ? (
          <Card className="border-none shadow-playful overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 font-display">
                <GraduationCap className="w-5 h-5 text-primary" />
                Filter by Grade Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GradeFilter
                selectedGrades={selectedGrades}
                onGradesChange={setSelectedGrades}
              />
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
        ) : selectedSource === 'quipper' ? (
          /* Hierarchical View for Quipper */
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
            {/* Grade Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Grade Levels</h3>
                <nav className="space-y-1">
                  {Object.entries(GRADE_LABELS).map(([grade, label]) => {
                    const gradeNum = parseInt(grade);
                    const isActive = activeGrade === gradeNum;
                    return (
                      <button
                        key={grade}
                        onClick={() => {
                          setActiveGrade(gradeNum);
                          setActiveSubject('all');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all group",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                            : "hover:bg-slate-50 text-slate-500"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <div className={cn(
                            "w-1 h-1 rounded-full",
                            isActive ? "bg-white" : "bg-slate-300 group-hover:bg-primary/50"
                          )} />
                          {label}
                        </span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-8 min-h-[500px]">
              <div className="space-y-6">
                {/* Subject Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveSubject('all')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                      activeSubject === 'all'
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                    )}
                  >
                    All Folders
                  </button>
                  {subjectsInActiveGrade.map((subj) => (
                    <button
                      key={subj}
                      onClick={() => setActiveSubject(subj)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                        activeSubject === subj
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <Folder className={cn("w-3 h-3", activeSubject === subj ? "fill-white/20" : "fill-slate-100")} />
                      {subj}
                    </button>
                  ))}
                </div>

                {/* Grid */}
                <div className="bg-white/50 rounded-3xl p-6 border border-white">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100/50 pb-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {GRADE_LABELS[activeGrade]}
                      {activeSubject !== 'all' && (
                        <>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                          <span className="text-primary">{activeSubject}</span>
                        </>
                      )}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                      {finalQuipperBooks.length} Modules
                    </span>
                  </div>

                  {finalQuipperBooks.length > 0 ? (
                    <TeacherBookGrid
                      books={finalQuipperBooks}
                      onBookClick={handleBookClick}
                      showSearch={true}
                      emptyMessage="No modules found in this folder"
                    />
                  ) : (
                    <div className="py-20 text-center">
                      <Folder className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400">Empty folder</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
