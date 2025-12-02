-- Add RLS policies for exercises table to allow WGER sync
-- Exercises is shared reference data, so authenticated users can insert/update

-- Allow authenticated users to insert exercises
CREATE POLICY "Authenticated users can insert exercises"
ON public.exercises
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update exercises  
CREATE POLICY "Authenticated users can update exercises"
ON public.exercises
FOR UPDATE
TO authenticated
USING (true);