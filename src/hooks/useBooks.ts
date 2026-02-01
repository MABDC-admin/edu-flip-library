import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Book, BookWithProgress, BookPage, ReadingProgress } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export function useBooks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['books'],
    queryFn: async (): Promise<BookWithProgress[]> => {
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!user) return books as BookWithProgress[];
      
      // Fetch reading progress for current user
      const { data: progress } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('student_id', user.id);
      
      const progressMap = new Map(
        progress?.map((p) => [p.book_id, p]) || []
      );
      
      return (books || []).map((book) => ({
        ...book,
        reading_progress: progressMap.get(book.id) || null,
      })) as BookWithProgress[];
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
      return data as Book;
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

export function useReadingProgress(bookId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reading-progress', bookId, user?.id],
    queryFn: async (): Promise<ReadingProgress | null> => {
      if (!bookId || !user) return null;
      
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', bookId)
        .eq('student_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ReadingProgress | null;
    },
    enabled: !!bookId && !!user,
  });
}

export function useUpdateReadingProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      bookId, 
      currentPage, 
      completed = false 
    }: { 
      bookId: string; 
      currentPage: number; 
      completed?: boolean;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          student_id: user.id,
          book_id: bookId,
          current_page: currentPage,
          completed,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'student_id,book_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress', data.book_id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
