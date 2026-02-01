import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooks } from '@/hooks/useBooks';
import { BookGrid } from '@/components/books/BookGrid';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, Sparkles, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { GRADE_LABELS } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function Bookshelf() {
  const { user, profile, signOut, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const { data: books, isLoading } = useBooks();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const allBooks = books || [];

  // Group books by grade
  const groupedBooks = allBooks.reduce((acc, book) => {
    const grade = book.grade_level;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(book);
    return acc;
  }, {} as Record<number, typeof allBooks>);

  // Sort grades ascending
  const sortedGrades = Object.keys(groupedBooks).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-gradient">MABDC</h1>
              <p className="text-xs text-muted-foreground">Library</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.grade_level ? GRADE_LABELS[profile.grade_level] : 'Student'}
              </p>
            </div>

            {isTeacher && !isAdmin && (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/teacher')}
                className="gradient-primary hidden sm:flex"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Teacher Dashboard
              </Button>
            )}

            {isAdmin && (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin')}
                >
                  Dashboard
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/admin/books')}
                  className="gradient-primary"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manage Books
                </Button>
              </div>
            )}

            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Sparkles className="w-8 h-8 text-accent" />
            <div>
              <h2 className="text-3xl font-display font-bold">
                Welcome back, {profile?.name?.split(' ')[0]}!
              </h2>
              <p className="text-muted-foreground">
                Ready to explore your {profile?.grade_level ? GRADE_LABELS[profile.grade_level] : 'MABDC'} library?
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search all books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-white/50 backdrop-blur-sm border-slate-200 focus:border-primary/50 transition-all rounded-xl shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-12">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="space-y-3">
                      <Skeleton className="aspect-[3/4] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {sortedGrades.length > 0 ? (
              sortedGrades.map((grade) => {
                const gradeBooks = groupedBooks[grade];
                const hasResults = searchQuery
                  ? gradeBooks.some(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  : true;

                if (!hasResults) return null;

                return (
                  <div key={grade} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-display font-bold text-gradient whitespace-nowrap">
                        {GRADE_LABELS[grade]}
                      </h3>
                      <div className="h-px flex-1 bg-slate-100" />
                      <span className="text-xs font-medium text-muted-foreground bg-slate-50 px-2 py-1 rounded-full">
                        {gradeBooks.length} Books
                      </span>
                    </div>

                    <BookGrid
                      books={gradeBooks}
                      externalSearchQuery={searchQuery}
                      emptyMessage={`No books found in ${GRADE_LABELS[grade]}`}
                    />
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your library is being prepared</h3>
                <p className="text-muted-foreground">Check back soon for new books!</p>
              </div>
            )}

            {searchQuery && !sortedGrades.some(grade =>
              groupedBooks[grade].some(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
            ) && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No matches found</h3>
                  <p className="text-muted-foreground">Try a different search term across the library</p>
                </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
}
