-- Ensure public bucket and robust RLS for anatomy models
-- Bucket creation (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'anatomy-models'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('anatomy-models', 'anatomy-models', true);
  END IF;
END $$;

-- Public read policy (anon + auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read anatomy models'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read anatomy models" 
      ON storage.objects
      FOR SELECT
      USING (bucket_id = ''anatomy-models'')';
  END IF;
END $$;

-- Admin-only insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload anatomy models'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can upload anatomy models" 
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = ''anatomy-models'' AND public.is_admin(auth.uid()))';
  END IF;
END $$;

-- Admin-only update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update anatomy models'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update anatomy models" 
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = ''anatomy-models'' AND public.is_admin(auth.uid()))
      WITH CHECK (bucket_id = ''anatomy-models'' AND public.is_admin(auth.uid()))';
  END IF;
END $$;

-- Admin-only delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete anatomy models'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete anatomy models" 
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = ''anatomy-models'' AND public.is_admin(auth.uid()))';
  END IF;
END $$;