-- Update the handle_new_user function to create profiles with default healthcare permissions
-- This allows testing - in production you'd want proper verification workflows
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with default healthcare permissions for testing
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name,
    healthcare_role,
    license_verified,
    approved_for_patient_access,
    professional_title
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    'physiotherapist'::healthcare_role,  -- Default role for testing
    true,  -- Auto-verify for testing
    true,  -- Auto-approve for testing
    'Physiotherapist'
  );
  
  -- Create user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();