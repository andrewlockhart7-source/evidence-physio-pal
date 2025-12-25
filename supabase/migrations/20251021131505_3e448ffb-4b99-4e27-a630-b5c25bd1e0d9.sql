-- Update existing profiles to have healthcare permissions
UPDATE public.profiles
SET 
  healthcare_role = 'physiotherapist'::healthcare_role,
  license_verified = true,
  approved_for_patient_access = true,
  professional_title = COALESCE(professional_title, 'Physiotherapist')
WHERE healthcare_role IS NULL;

-- Create a notification for updated users
INSERT INTO public.notifications (user_id, title, message, type)
SELECT 
  user_id,
  'Healthcare Access Granted',
  'Your account has been updated with healthcare provider permissions. You can now access patient management features.',
  'system'
FROM public.profiles
WHERE healthcare_role = 'physiotherapist'::healthcare_role
ON CONFLICT DO NOTHING;