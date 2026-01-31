-- Add svg_url and thumbnail_url to book_pages
ALTER TABLE public.book_pages 
ADD COLUMN IF NOT EXISTS svg_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Ensure book-pages bucket is public for easy image/svg access
-- We can't easily ALTER a bucket from SQL in Supabase storage via schema alone reliably without using the storage extension functions
-- But we can update the buckets table directly if permissions allow, or ensure the policy allows public select.

-- 1. Ensure bucket is marked public (Supabase storage.buckets table)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'book-pages';

-- 2. Ensure public READ access policy for book-pages
DROP POLICY IF EXISTS "Anyone can view book pages" ON storage.objects;
CREATE POLICY "Anyone can view book pages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-pages');

-- 3. Ensure admins can still do everything
DROP POLICY IF EXISTS "Admins can do everything in book-pages" ON storage.objects;
CREATE POLICY "Admins can do everything in book-pages"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'book-pages' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'book-pages' AND public.is_admin(auth.uid()));
