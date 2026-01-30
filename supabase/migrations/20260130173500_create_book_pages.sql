-- Create book_pages table to store generated page images
CREATE TABLE IF NOT EXISTS public.book_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(book_id, page_number)
);

-- Enable RLS
ALTER TABLE public.book_pages ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public/Authenticated Read Access (Matches Book Access)
CREATE POLICY "Public read access for book_pages"
ON public.book_pages
FOR SELECT
TO authenticated, anon
USING (true); -- Simply allow reading all page images if you have the link (simplification for flipbooks)

-- 2. Service Role / Admin Write Access
CREATE POLICY "Admin/Service write access for book_pages"
ON public.book_pages
FOR ALL
TO authenticated, service_role
USING (
  public.is_admin(auth.uid()) OR 
  auth.role() = 'service_role'
)
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  auth.role() = 'service_role'
);

-- Index for faster querying
CREATE INDEX idx_book_pages_book_id ON public.book_pages(book_id);
CREATE INDEX idx_book_pages_book_page ON public.book_pages(book_id, page_number);
