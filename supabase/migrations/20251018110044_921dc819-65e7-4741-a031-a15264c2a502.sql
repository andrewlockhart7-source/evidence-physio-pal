-- Create public bucket for anatomy models if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'anatomy-models'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('anatomy-models', 'anatomy-models', true);
  END IF;
END $$;

-- Public read access to models in anatomy-models bucket
CREATE POLICY "Public read anatomy models"
ON storage.objects
FOR SELECT
USING (bucket_id = 'anatomy-models');

-- Admin-only writes (insert/update/delete)
CREATE POLICY "Admins can upload anatomy models"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anatomy-models' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update anatomy models"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'anatomy-models' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'anatomy-models' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete anatomy models"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'anatomy-models' AND public.is_admin(auth.uid()));