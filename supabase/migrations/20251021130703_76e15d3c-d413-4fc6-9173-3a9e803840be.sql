-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "patients_strict_access_only" ON patients;

-- Create separate policies for better control
-- Allow healthcare providers to insert their own patients
CREATE POLICY "Healthcare providers can create patients"
ON patients
FOR INSERT
TO authenticated
WITH CHECK (
  therapist_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.healthcare_role IS NOT NULL
    AND p.license_verified = true
    AND p.approved_for_patient_access = true
  )
);

-- Allow healthcare providers to view patients they created OR are assigned to
CREATE POLICY "Healthcare providers can view their patients"
ON patients
FOR SELECT
TO authenticated
USING (
  (therapist_id = auth.uid() OR EXISTS (
    SELECT 1 FROM patient_assignments pa
    WHERE pa.patient_id = patients.id
    AND pa.therapist_id = auth.uid()
    AND pa.is_active = true
  ))
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.healthcare_role IS NOT NULL
    AND p.license_verified = true
    AND p.approved_for_patient_access = true
  )
);

-- Allow healthcare providers to update their own patients
CREATE POLICY "Healthcare providers can update their patients"
ON patients
FOR UPDATE
TO authenticated
USING (
  therapist_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.healthcare_role IS NOT NULL
    AND p.license_verified = true
    AND p.approved_for_patient_access = true
  )
);

-- Allow healthcare providers to delete their own patients
CREATE POLICY "Healthcare providers can delete their patients"
ON patients
FOR DELETE
TO authenticated
USING (
  therapist_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.healthcare_role IS NOT NULL
    AND p.license_verified = true
    AND p.approved_for_patient_access = true
  )
);