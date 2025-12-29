-- Create extracted_files table
CREATE TABLE public.extracted_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extracted_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view extracted files"
ON public.extracted_files
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert extracted files"
ON public.extracted_files
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can delete extracted files"
ON public.extracted_files
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_extracted_files_project_id ON public.extracted_files(project_id);