import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { GradeFilter, GradeGroup } from '@/components/teacher/GradeFilter';
import { TeacherBookGrid } from '@/components/teacher/TeacherBookGrid';
import { BookDetailsDialog } from '@/components/teacher/BookDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookWithProgress, GRADE_LABELS } from '@/types/database';
import { BookOpen, Users, TrendingUp, GraduationCap, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TeacherDashboard() {
  const { user, isTeacher, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedGroup, setSelectedGroup] = useState<GradeGroup>('all');
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookWithProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect if not authenticated or not a teacher/admin
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (!authLoading && !isTeacher && !isAdmin) {
    navigate('/bookshelf');
    return null;
  }

  // Fetch all books (teachers can see all)
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['teacher-books'],
    queryFn: async (): Promise<BookWithProgress[]> => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'ready')
        .order('grade_level', { ascending: true });

      if (error) throw error;
      return (data || []) as BookWithProgress[];
    },
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: async () => {
      const [booksResult, studentsResult, progressResult] = await Promise.all([
        supabase.from('books').select('id, grade_level, status'),
        supabase.from('profiles').select('id, grade_level'),
        supabase
          .from('reading_progress')
          .select('id, completed')
          .eq('completed', true),
      ]);

      const allBooks = booksResult.data || [];
      const students = studentsResult.data || [];
      const completedBooks = progressResult.data || [];

      // Group books by grade
      const booksByGrade: Record<number, number> = {};
      allBooks.forEach((b) => {
        if (b.grade_level && b.status === 'ready') {
          booksByGrade[b.grade_level] = (booksByGrade[b.grade_level] || 0) + 1;
        }
      });

      return {
        totalBooks: allBooks.filter((b) => b.status === 'ready').length,
        totalStudents: students.length,
        completedReads: completedBooks.length,
        booksByGrade,
      };
    },
  });

  // Filter books by selected grades
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    if (selectedGrades.length === 0) return books;
    return books.filter((book) => selectedGrades.includes(book.grade_level));
  }, [books, selectedGrades]);

  // Group books by grade for organized display
  const booksByGrade = useMemo(() => {
    const grouped: Record<number, BookWithProgress[]> = {};
    filteredBooks.forEach((book) => {
      if (!grouped[book.grade_level]) {
        grouped[book.grade_level] = [];
      }
      grouped[book.grade_level].push(book);
    });
    return grouped;
  }, [filteredBooks]);

  const handleBookClick = (book: BookWithProgress) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  const handleGradeSelect = (value: string) => {
    if (value === 'all') {
      setSelectedGroup('all');
      setSelectedGrades([]);
    } else {
      const gradeNum = parseInt(value);
      setSelectedGroup('all'); // Clear group selection
      setSelectedGrades([gradeNum]);
    }
  };

  const isLoading = booksLoading || statsLoading;

  const statCards = [
    {
      title: 'Total Books',
      value: stats?.totalBooks || 0,
      icon: BookOpen,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-success/10 text-success',
    },
    {
      title: 'Books Completed',
      value: stats?.completedReads || 0,
      icon: TrendingUp,
      color: 'bg-accent/10 text-accent',
    },
    {
      title: 'Grades Covered',
      value: Object.keys(stats?.booksByGrade || {}).length,
      icon: GraduationCap,
      color: 'bg-secondary/10 text-secondary',
    },
  ];

  return (
    <TeacherLayout title="eBook Library">
      <div className="space-y-8">
        {/* Quick Access Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Quick Grade View
            </h2>
            <p className="text-xs text-muted-foreground">Jump directly to a specific grade level</p>
          </div>

          <Select
            value={selectedGrades.length === 1 ? selectedGrades[0].toString() : 'all'}
            onValueChange={handleGradeSelect}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {Object.entries(GRADE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))
            : statCards.map((stat, i) => (
              <Card key={i} className="hover:shadow-card transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Grade Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter by Grade Level</CardTitle>
          </CardHeader>
          <CardContent>
            <GradeFilter
              selectedGroup={selectedGroup}
              onGroupChange={setSelectedGroup}
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
          // Show all books in a single grid when no filter
          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold">
              All Books ({filteredBooks.length})
            </h3>
            <TeacherBookGrid
              books={filteredBooks}
              onBookClick={handleBookClick}
              showSearch
              emptyMessage="No books available in the library"
            />
          </div>
        ) : (
          // Show books grouped by grade when filtered
          <div className="space-y-8">
            {Object.entries(booksByGrade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, gradeBooks]) => (
                <div key={grade} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-display font-semibold">
                      {GRADE_LABELS[Number(grade)]}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      ({gradeBooks.length} books)
                    </span>
                  </div>
                  <TeacherBookGrid
                    books={gradeBooks}
                    onBookClick={handleBookClick}
                    showSearch={false}
                    emptyMessage="No books for this grade"
                  />
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
