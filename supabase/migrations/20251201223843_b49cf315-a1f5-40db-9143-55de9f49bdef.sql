-- Add exercise_name column to workout_exercises table
ALTER TABLE public.workout_exercises
ADD COLUMN exercise_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.workout_exercises.exercise_name IS 'Temporary storage for exercise names until WGER API integration is complete';