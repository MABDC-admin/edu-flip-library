-- Enable CORS for pdf-uploads to allow client-side rendering (react-pdf)
UPDATE storage.buckets
SET public = true,
    allowed_mime_types = '{application/pdf}',
    file_size_limit = 524288000 -- 500MB
WHERE id = 'pdf-uploads';
