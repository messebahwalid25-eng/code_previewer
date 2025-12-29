-- Create the extracted-files bucket
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'extracted-files', 
  'extracted-files', 
  false,
  ARRAY[
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/typescript',
    'application/json',
    'application/xml',
    'text/xml',
    'text/markdown',
    'text/x-dart',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/x-icon',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for extracted-files bucket
CREATE POLICY "Anyone can view extracted files storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'extracted-files');

CREATE POLICY "Service role can upload extracted files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'extracted-files');

CREATE POLICY "Service role can delete extracted files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'extracted-files');