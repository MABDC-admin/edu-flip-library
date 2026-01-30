import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, TrendingUp, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { GRADE_LABELS } from '@/types/database';

export default function AdminDashboard() {
  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [booksResult, studentsResult, progressResult] = await Promise.all([
        supabase.from('books').select('id, grade_level, status'),
        supabase.from('profiles').select('id, grade_level'),
        supabase.from('reading_progress').select('id, completed, last_read_at').order('last_read_at', { ascending: false }).limit(10),
      ]);

      const books = booksResult.data || [];
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
        totalBooks: books.length,
        readyBooks: books.filter((b) => b.status === 'ready').length,
        processingBooks: books.filter((b) => b.status === 'processing').length,
        totalStudents: students.length,
        studentsByGrade,
        recentActivity: recentActivity.length,
      };
    },
  });

  const statCards = [
    {
      title: 'Total Books',
      value: stats?.totalBooks || 0,
      description: `${stats?.readyBooks || 0} ready, ${stats?.processingBooks || 0} processing`,
      icon: BookOpen,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      description: 'Registered accounts',
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

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-card transition-shadow cursor-pointer group" onClick={() => window.location.href = '/admin/books'}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Manage Books</h3>
                <p className="text-sm text-muted-foreground">
                  Upload PDFs and organize your library
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card transition-shadow cursor-pointer group" onClick={() => window.location.href = '/admin/students'}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Manage Students</h3>
                <p className="text-sm text-muted-foreground">
                  Create accounts and assign grades
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
