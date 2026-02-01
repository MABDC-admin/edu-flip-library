-- Add text_content column to book_pages for TTS support
ALTER TABLE public.book_pages ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Update RLS policies (usually not needed if already based on book access, but good to check)
-- Existing policy: CREATE POLICY "Users can view pages of accessible books" ON public.book_pages FOR SELECT TO authenticated USING (public.can_access_book(book_id));
-- This will automatically cover the new column.
