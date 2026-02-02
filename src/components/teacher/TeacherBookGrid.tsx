import { BookWithProgress, GRADE_LABELS } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TeacherBookGridProps {
  books: BookWithProgress[];
  onBookClick: (book: BookWithProgress) => void;
  emptyMessage?: string;
  showSearch?: boolean;
}

const gradeColorClasses: Record<number, string> = {
  1: 'from-grade-1/80 to-grade-1',
  2: 'from-grade-2/80 to-grade-2',
  3: 'from-grade-3/80 to-grade-3',
  4: 'from-grade-4/80 to-grade-4',
  5: 'from-grade-5/80 to-grade-5',
  6: 'from-grade-6/80 to-grade-6',
  7: 'from-grade-7/80 to-grade-7',
  8: 'from-grade-8/80 to-grade-8',
  9: 'from-grade-9/80 to-grade-9',
  10: 'from-grade-10/80 to-grade-10',
  11: 'from-grade-11/80 to-grade-11',
  12: 'from-grade-12/80 to-grade-12',
};

export function TeacherBookGrid({
  books,
  onBookClick,
  emptyMessage = "No books found",
  showSearch = false,
}: TeacherBookGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = searchQuery
    ? books.filter((book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : books;

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search books by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 items-stretch">
          {filteredBooks.map((book, index) => (
            <Card
              key={book.id}
              onClick={() => onBookClick(book)}
              className={cn(
                "group relative overflow-hidden cursor-pointer transition-all duration-300 h-full flex flex-col",
                "hover:shadow-book hover:-translate-y-2 hover:scale-105",
                "animate-fade-in-up opacity-0"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Book Cover */}
              <div
                className={cn(
                  "aspect-[3/4] relative bg-gradient-to-br",
                  gradeColorClasses[book.grade_level] || 'from-muted to-muted'
                )}
              >
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <BookOpen className="w-16 h-16 text-white/50" />
                  </div>
                )}

                {/* Grade badge */}
                <Badge className="absolute top-2 left-2 bg-white/90 text-foreground font-semibold text-xs">
                  {GRADE_LABELS[book.grade_level]}
                </Badge>

                {/* Status indicator */}
                {book.status !== 'ready' && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 text-xs"
                  >
                    {book.status}
                  </Badge>
                )}

                {/* 3D book spine effect */}
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-black/20 to-transparent" />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>

              <div className="p-3 flex-grow flex flex-col">
                <h3 className="font-display font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem] flex items-start">
                  {book.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {book.page_count} pages
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">{emptyMessage}</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term
            </p>
          )}
        </div>
      )}
    </div>
  );
}
