-- Add workout_plan_id to conversations table to link conversations with generated workout plans
ALTER TABLE conversations 
ADD COLUMN workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_conversations_workout_plan_id ON conversations(workout_plan_id);