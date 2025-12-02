-- Add composite index for workout exercises lookups
CREATE INDEX IF NOT EXISTS idx_workout_exercises_day_order 
ON workout_exercises(workout_day_id, exercise_order);

-- Add index for faster conversation lookups by plan
CREATE INDEX IF NOT EXISTS idx_conversations_plan_user 
ON conversations(workout_plan_id, user_id);

-- Add index for message timestamp queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

COMMENT ON INDEX idx_workout_exercises_day_order IS 'Speeds up exercise loading within workout days';
COMMENT ON INDEX idx_conversations_plan_user IS 'Speeds up conversation-to-plan lookups';
COMMENT ON INDEX idx_messages_conversation_created IS 'Speeds up message history queries';