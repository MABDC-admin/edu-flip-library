import { useAuth } from '@/contexts/AuthContext';
import { useBooks } from '@/hooks/useBooks';
import { BookGrid } from '@/components/books/BookGrid';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GRADE_LABELS } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function Bookshelf() {
  const { user, profile, signOut, isAdmin, isTeacher } = useAuth();
  const { data: books, isLoading } = useBooks();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  const allBooks = books || [];

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
        <div className="mb-8 flex items-center gap-4">
          <Sparkles className="w-8 h-8 text-accent" />
          <div>
            <h2 className="text-3xl font-display font-bold">
              Welcome back, {profile?.name?.split(' ')[0]}!
            </h2>
            <p className="text-muted-foreground">
              Ready to explore your {profile?.grade_level ? GRADE_LABELS[profile.grade_level] : ''} library?
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <BookGrid
              books={allBooks}
              showSearch
              emptyMessage="No books available for your grade level yet"
            />
          </div>
        )}
      </main>
    </div>
  );
}
