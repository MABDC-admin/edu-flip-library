import { BookWithProgress } from '@/types/database';
import { BookCard } from './BookCard';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface BookGridProps {
  books: BookWithProgress[];
  title?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  externalSearchQuery?: string;
}

export function BookGrid({
  books,
  title,
  emptyMessage = "No books found",
  showSearch = false,
  externalSearchQuery
}: BookGridProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  const query = showSearch ? internalSearchQuery : (externalSearchQuery || '');

  const filteredBooks = query
    ? books.filter((book) =>
      book.title.toLowerCase().includes(query.toLowerCase())
    )
    : books;

  return (
    <div className="space-y-6">
      {(title || showSearch) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {title && (
            <h2 className="text-2xl font-display font-bold text-gradient">
              {title}
            </h2>
          )}

          {showSearch && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search books..."
                value={internalSearchQuery}
                onChange={(e) => setInternalSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>
      )}

      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {filteredBooks.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              className="opacity-0"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">{emptyMessage}</p>
          {query && (
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term
            </p>
          )}
        </div>
      )}
    </div>
  );
}
