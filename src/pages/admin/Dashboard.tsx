import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, TrendingUp, Clock, Filter, Book } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GRADE_LABELS } from '@/types/database';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const { toast } = useToast();
  const [isTestEmailLoading, setIsTestEmailLoading] = useState(false);

  const sendTestEmail = async () => {
    setIsTestEmailLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-admin', {
        body: { type: 'test', user_email: 'Admin', user_role: 'admin' }
      });
      if (error) throw error;
      toast({ title: "Test Email Sent", description: "Check your inbox (and spam folder)." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Test Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsTestEmailLoading(false);
    }
  };

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [booksResult, studentsResult, progressResult] = await Promise.all([
        (supabase.from('books') as any).select('id, title, grade_level, status, cover_url, source, is_teacher_only'),
        supabase.from('profiles').select('id, grade_level'),
        supabase.from('reading_progress').select('id, completed, last_read_at').order('last_read_at', { ascending: false }).limit(10),
      ]);

      const books = (booksResult.data as any[]) || [];
      const students = studentsResult.data || [];
      const recentActivity = progressResult.data || [];

      // Group students by grade
      const studentsByGrade: Record<number, number> = {};
      students.forEach((s) => {
        if (s.grade_level) {
          studentsByGrade[s.grade_level] = (studentsByGrade[s.grade_level] || 0) + 1;
        }
      });

      return {
        books,
        students,
        totalBooks: books.length,
        readyBooks: books.filter((b) => b.status === 'ready').length,
        processingBooks: books.filter((b) => b.status === 'processing').length,
        totalStudents: students.length,
        studentsByGrade,
        recentActivity: recentActivity.length,
      };
    },
  });

  // Filtered stats
  const filteredStats = useMemo(() => {
    if (!stats) return null;
    let filteredBooks = stats.books;

    if (filterGrade !== 'all') {
      const gradeNum = parseInt(filterGrade);
      filteredBooks = filteredBooks.filter((b: any) => b.grade_level === gradeNum);
    }

    if (filterSource !== 'all') {
      filteredBooks = filteredBooks.filter((b: any) => b.source === filterSource);
    }

    const gradeNum = filterGrade === 'all' ? null : parseInt(filterGrade);
    const filteredStudentsCount = gradeNum ? (stats.studentsByGrade[gradeNum] || 0) : stats.students.length;

    return {
      ...stats,
      totalBooks: filteredBooks.length,
      readyBooks: filteredBooks.filter((b: any) => b.status === 'ready').length,
      processingBooks: filteredBooks.filter((b: any) => b.status === 'processing').length,
      totalStudents: filteredStudentsCount,
    };
  }, [stats, filterGrade, filterSource]);

  const statCards = [
    {
      title: 'Total Books',
      value: filteredStats?.totalBooks || 0,
      description: `${filteredStats?.readyBooks || 0} ready, ${filteredStats?.processingBooks || 0} processing`,
      icon: BookOpen,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Total Students',
      value: filteredStats?.totalStudents || 0,
      description: filterGrade === 'all' ? 'Registered accounts' : `Students in ${GRADE_LABELS[parseInt(filterGrade)]}`,
      icon: Users,
      color: 'bg-success/10 text-success',
    },
    {
      title: 'Active Readers',
      value: stats?.recentActivity || 0,
      description: 'Recent reading sessions',
      icon: TrendingUp,
      color: 'bg-accent/10 text-accent',
    },
    {
      title: 'Grades Covered',
      value: Object.keys(stats?.studentsByGrade || {}).length,
      description: 'Out of 12 grade levels',
      icon: Clock,
      color: 'bg-secondary/10 text-secondary',
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Quick Filter
            </h2>
            <p className="text-xs text-muted-foreground">Filter dashboard data</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="internal">Internal Library</SelectItem>
                <SelectItem value="quipper">Quipper Library</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterGrade} onValueChange={setFilterGrade}>
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
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, i) => (
              <Card key={i} className="hover:shadow-card transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Students by grade */}
        <Card>
          <CardHeader>
            <CardTitle>Students by Grade Level</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => {
                  const count = stats?.studentsByGrade?.[grade] || 0;
                  return (
                    <div
                      key={grade}
                      className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors"
                    >
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">
                        {GRADE_LABELS[grade]}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Books for selected grade (if filtered) */}
        {filterGrade !== 'all' && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Book className="w-5 h-5 text-primary" />
                Books for {GRADE_LABELS[parseInt(filterGrade)]}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/books')}>
                Manage All
              </Button>
            </CardHeader>
            <CardContent>
              {filteredStats?.books && filteredStats.books.filter(b => b.grade_level === parseInt(filterGrade)).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredStats.books
                    .filter(b => b.grade_level === parseInt(filterGrade))
                    .slice(0, 10) // Show top 10
                    .map((book) => (
                      <div key={book.id} className="group relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted/30 hover:shadow-md transition-all">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                          <p className="text-[10px] font-medium text-white truncate">{book.title}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-dashed">
                  <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No books uploaded for this grade level yet</p>
                  <Button variant="link" size="sm" onClick={() => navigate('/admin/books')}>
                    Click here to upload
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="hover:shadow-card transition-shadow cursor-pointer group relative overflow-hidden"
            onClick={() => navigate('/admin/books')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Manage Books</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload PDFs and organize your library
                </p>
                <Button size="sm" variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Library
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-card transition-shadow cursor-pointer group relative overflow-hidden"
            onClick={() => navigate('/admin/students')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-success-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Manage Students</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create accounts and assign grades
                </p>
                <Button size="sm" variant="secondary" className="group-hover:bg-success group-hover:text-success-foreground transition-colors">
                  View Students
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-card transition-shadow cursor-pointer group relative overflow-hidden"
            onClick={sendTestEmail}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isTestEmailLoading ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Mail className="w-6 h-6 text-orange-500" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Test Email Notification</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Check if system emails are delivering correctly
                </p>
                <Button size="sm" variant="secondary" disabled={isTestEmailLoading}>
                  {isTestEmailLoading ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout >
  );
}
