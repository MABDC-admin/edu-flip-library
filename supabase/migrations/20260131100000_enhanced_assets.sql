-- Add svg_url and thumbnail_url to book_pages
ALTER TABLE public.book_pages 
ADD COLUMN IF NOT EXISTS svg_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Update helper function to check if user can access a book
-- Admins should be able to see books even if they are not 'ready' yet
CREATE OR REPLACE FUNCTION public.can_access_book(_book_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.books b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = _book_id
      AND (
        public.is_admin(auth.uid())
        OR (
          b.status = 'ready'
          AND b.grade_level = p.grade_level
        )
      )
  )
$$;

-- Ensure book-pages bucket is public for easy image/svg access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'book-pages';

-- 1. Ensure public READ access policy for book-pages (Storage)
DROP POLICY IF EXISTS "Anyone can view book pages" ON storage.objects;
CREATE POLICY "Anyone can view book pages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-pages');

-- 2. Ensure admins can still do everything (Storage)
DROP POLICY IF EXISTS "Admins can do everything in book-pages" ON storage.objects;
CREATE POLICY "Admins can do everything in book-pages"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'book-pages' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'book-pages' AND public.is_admin(auth.uid()));
