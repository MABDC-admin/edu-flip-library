import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookGrid } from '@/components/books/BookGrid';
import { Folder, Search } from 'lucide-react';
import { GRADE_LABELS } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// New Components
import { BookshelfHeader } from '@/components/bookshelf/BookshelfHeader';
import { BookshelfFilters } from '@/components/bookshelf/BookshelfFilters';
import { GradeSidebar } from '@/components/bookshelf/GradeSidebar';

// Hook
import { useBookshelf } from '@/hooks/useBookshelf';

export default function Bookshelf() {
  const { user, profile, signOut, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { state, actions, data } = useBookshelf();
  const { searchQuery, activeGrade, activeSubject, isLoading: booksLoading } = state;
  const { setSearchQuery, setActiveGrade, setActiveSubject } = actions;
  const { unifiedGrouped, subjectsInActiveGrade } = data;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
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

  const showSidebar = isAdmin || isTeacher;

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <BookshelfHeader
        profile={profile}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 flex gap-6 lg:gap-8 will-change-auto">
        {showSidebar && (
          <div className="pt-2 lg:pt-3">
            <GradeSidebar
              activeGrade={activeGrade}
              onGradeChange={setActiveGrade}
              profile={profile}
              isAdmin={isAdmin}
              isTeacher={isTeacher}
            />
          </div>
        )}

        <main className="flex-1 py-2 lg:py-3 min-w-0 transition-all duration-300">
          <div className="mb-2 flex flex-col md:flex-row md:items-end justify-end gap-8">
            <BookshelfFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {booksLoading ? (
            <div className="space-y-8 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-8 w-64 rounded-xl" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="space-y-4">
                        <Skeleton className="aspect-[3/4] rounded-2xl shadow-sm" />
                        <Skeleton className="h-4 w-3/4 rounded-full" />
                        <Skeleton className="h-3 w-1/2 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pb-16">
              <div className="pb-16 space-y-12">
                {/* Subject Folders */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setActiveSubject('all')}
                    className={cn(
                      "px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm",
                      activeSubject === 'all'
                        ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200"
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
                        "flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm",
                        activeSubject === subj
                          ? "bg-accent text-accent-foreground border-accent shadow-lg shadow-accent/10"
                          : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <Folder className={cn("w-4 h-4", activeSubject === subj ? "fill-current" : "text-slate-200")} />
                      {subj}
                    </button>
                  ))}
                </div>

                {/* Unified Content Grid */}
                <div className="space-y-12">
                  {Object.entries(unifiedGrouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([subj, subjBooks]) => {
                      if (subjBooks.length === 0) return null;

                      return (
                        <div key={subj} className="space-y-6">
                          {subj !== 'Uncategorized' && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                                <Folder className="w-5 h-5 text-primary/40" />
                              </div>
                              <h4 className="text-xl font-bold text-slate-800">{subj}</h4>
                            </div>
                          )}
                          <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-white shadow-sm">
                            <BookGrid
                              books={subjBooks}
                              externalSearchQuery={searchQuery}
                              emptyMessage={`No books found in ${subj}`}
                            />
                          </div>
                        </div>
                      );
                    })}

                  {Object.keys(unifiedGrouped).length === 0 && (
                    <div className="py-24 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No books match your selection</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
