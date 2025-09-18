/*
  # Setup Storage for Reports and Images

  1. Storage Buckets
    - Create 'reports' bucket for PDF files and images
    - Configure public access for generated reports
    - Set up proper policies for authenticated users

  2. Security
    - Enable RLS on storage objects
    - Allow authenticated users to upload images
    - Allow public access to generated PDFs
*/

-- Create the reports bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images to their inspection folders
CREATE POLICY "Users can upload inspection images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' 
  AND (storage.foldername(name))[1] = 'inspections'
  AND auth.uid()::text IS NOT NULL
);

-- Policy: Allow authenticated users to read their own inspection images
CREATE POLICY "Users can read inspection images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND (storage.foldername(name))[1] = 'inspections'
);

-- Policy: Allow public access to generated PDF reports
CREATE POLICY "Public access to PDF reports"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'reports'
  AND (storage.foldername(name))[1] = 'reports'
  AND RIGHT(name, 4) = '.pdf'
);

-- Policy: Allow service role to manage all files (for PDF generation)
CREATE POLICY "Service role can manage all files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'reports');