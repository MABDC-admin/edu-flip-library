-- Add html5_url column to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS html5_url text;

-- Create storage bucket for HTML5 uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('html5-uploads', 'html5-uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public to view html5 files
CREATE POLICY "Public Access HTML5" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'html5-uploads' );

-- Policy to allow authenticated users to upload
CREATE POLICY "Auth Upload HTML5" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'html5-uploads' AND auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update/delete
CREATE POLICY "Auth Manage HTML5" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'html5-uploads' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Delete HTML5" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'html5-uploads' AND auth.role() = 'authenticated' );
