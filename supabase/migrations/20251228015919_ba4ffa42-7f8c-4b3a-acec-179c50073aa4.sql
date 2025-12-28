-- Update the project-files bucket to allow zip and rar mime types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/octet-stream'
]
WHERE id = 'project-files';

-- Also update the extracted-files bucket to allow common file types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
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
WHERE id = 'extracted-files';