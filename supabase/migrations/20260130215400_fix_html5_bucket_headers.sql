-- Update html5-uploads bucket to serve files inline
UPDATE storage.buckets 
SET public = true, 
    file_size_limit = 104857600,  -- 100MB limit
    allowed_mime_types = ARRAY[
      'text/html',
      'text/css', 
      'application/javascript',
      'text/javascript',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'application/json',
      'application/octet-stream',
      'application/xml',
      'text/xml'
    ]
WHERE id = 'html5-uploads';
