-- Remove overly permissive INSERT and UPDATE policies from exercises table
-- Exercises is reference data that should be read-only for regular users
-- Admin/system operations use service role key which bypasses RLS

DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can update exercises" ON public.exercises;

-- The SELECT policy remains: "Authenticated users can view exercises"