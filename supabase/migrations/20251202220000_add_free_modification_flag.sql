-- Add has_used_free_modification flag to user_fitness_profiles
-- This tracks whether the user has used their one free plan modification
-- Free tier: 1 auto-generated plan + 1 modification session
-- After first modification, any further changes require premium

ALTER TABLE public.user_fitness_profiles 
ADD COLUMN IF NOT EXISTS has_used_free_modification BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.user_fitness_profiles.has_used_free_modification IS 
'Tracks if user has used their one free plan modification. True = premium required for further changes.';

