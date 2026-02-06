import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Book, BookWithProgress, BookPage } from '@/types/database';

export function useBooks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['books'],
    queryFn: async (): Promise<BookWithProgress[]> => {
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((books || []) as any) as BookWithProgress[];
    },
    enabled: !!user,
  });
}

export function useBook(bookId: string | undefined) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: async (): Promise<Book | null> => {
      if (!bookId) return null;

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      return data as any as Book;
    },
    enabled: !!bookId,
  });
}

export function useBookPages(bookId: string | undefined) {
  return useQuery({
    queryKey: ['book-pages', bookId],
    queryFn: async (): Promise<BookPage[]> => {
      if (!bookId) return [];

      const { data, error } = await supabase
        .from('book_pages')
        .select('*')
        .eq('book_id', bookId)
        .order('page_number', { ascending: true });

      if (error) throw error;
      return data as BookPage[];
    },
    enabled: !!bookId,
  });
}

