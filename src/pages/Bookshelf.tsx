import { useAuth } from '@/contexts/AuthContext';
import { useBooks } from '@/hooks/useBooks';
import { BookGrid } from '@/components/books/BookGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, Sparkles, BookMarked, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GRADE_LABELS } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function Bookshelf() {
  const { user, profile, signOut, isAdmin } = useAuth();
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

  // Filter books by category
  const allBooks = books || [];
  const currentlyReading = allBooks.filter(
    (book) => book.reading_progress && 
              book.reading_progress.current_page > 1 && 
              !book.reading_progress.completed
  );
  const completedBooks = allBooks.filter(
    (book) => book.reading_progress?.completed
  );

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
              <h1 className="font-display font-bold text-xl text-gradient">EduFlip</h1>
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
            
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                className="hidden sm:flex"
              >
                Admin Dashboard
              </Button>
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

        {/* Book tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="gap-2">
              <BookOpen className="w-4 h-4" />
              All Books
            </TabsTrigger>
            <TabsTrigger value="reading" className="gap-2">
              <BookMarked className="w-4 h-4" />
              Currently Reading
              {currentlyReading.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {currentlyReading.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
              {completedBooks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-success text-success-foreground rounded-full">
                  {completedBooks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="all">
                <BookGrid 
                  books={allBooks}
                  showSearch
                  emptyMessage="No books available for your grade level yet"
                />
              </TabsContent>
              
              <TabsContent value="reading">
                <BookGrid 
                  books={currentlyReading}
                  emptyMessage="You're not currently reading any books"
                />
              </TabsContent>
              
              <TabsContent value="completed">
                <BookGrid 
                  books={completedBooks}
                  emptyMessage="You haven't completed any books yet"
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}
