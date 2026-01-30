-- Add pdf_url column to books table to track the source PDF file
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pdf_url TEXT;
