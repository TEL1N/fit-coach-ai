-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Fitness Profiles
CREATE TABLE public.user_fitness_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fitness_goal TEXT,
  experience_level TEXT,
  available_equipment TEXT[],
  workout_frequency INTEGER,
  limitations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Exercises (cached from WGER API)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wger_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  description TEXT,
  equipment TEXT[],
  muscles TEXT[],
  category TEXT,
  image_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Exercise Aliases (for fuzzy matching)
CREATE TABLE public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alias TEXT UNIQUE NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  confidence_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Workout Plans
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weeks_duration INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Workout Days
CREATE TABLE public.workout_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL,
  day_order INTEGER NOT NULL,
  week_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Workout Exercises
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id),
  exercise_order INTEGER NOT NULL,
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Exercise Logs (tracking completions)
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_exercise_id UUID REFERENCES public.workout_exercises(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sets_completed INTEGER,
  notes TEXT
);

-- Create Performance Indexes
CREATE INDEX idx_exercises_normalized ON public.exercises(name_normalized);
CREATE INDEX idx_exercise_aliases_alias ON public.exercise_aliases(alias);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_workout_days_plan ON public.workout_days(workout_plan_id);
CREATE INDEX idx_workout_exercises_day ON public.workout_exercises(workout_day_id);
CREATE INDEX idx_exercise_logs_user ON public.exercise_logs(user_id, completed_at);

-- Enable Row Level Security
ALTER TABLE public.user_fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_fitness_profiles
CREATE POLICY "Users can view their own fitness profile"
  ON public.user_fitness_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness profile"
  ON public.user_fitness_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness profile"
  ON public.user_fitness_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness profile"
  ON public.user_fitness_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for exercises (readable by all authenticated users)
CREATE POLICY "Authenticated users can view exercises"
  ON public.exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for exercise_aliases (readable by all authenticated users)
CREATE POLICY "Authenticated users can view exercise aliases"
  ON public.exercise_aliases
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their conversations"
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for workout_plans
CREATE POLICY "Users can view their own workout plans"
  ON public.workout_plans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout plans"
  ON public.workout_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans"
  ON public.workout_plans
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans"
  ON public.workout_plans
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for workout_days
CREATE POLICY "Users can view their own workout days"
  ON public.workout_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans
      WHERE workout_plans.id = workout_days.workout_plan_id
      AND workout_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert workout days in their plans"
  ON public.workout_days
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans
      WHERE workout_plans.id = workout_days.workout_plan_id
      AND workout_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workout days in their plans"
  ON public.workout_days
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans
      WHERE workout_plans.id = workout_days.workout_plan_id
      AND workout_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workout days in their plans"
  ON public.workout_days
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans
      WHERE workout_plans.id = workout_days.workout_plan_id
      AND workout_plans.user_id = auth.uid()
    )
  );

-- RLS Policies for workout_exercises
CREATE POLICY "Users can view their own workout exercises"
  ON public.workout_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_days
      JOIN public.workout_plans ON workout_plans.id = workout_days.workout_plan_id
      WHERE workout_days.id = workout_exercises.workout_day_id
      AND workout_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert workout exercises in their plans"
  ON public.workout_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_days
      JOIN public.workout_plans ON workout_plans.id = workout_days.workout_plan_id
      WHERE workout_days.id = workout_exercises.workout_day_id
      AND workout_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workout exercises in their plans"
  ON public.workout_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_days
      JOIN public.workout_plans ON workout_plans.id = workout_days.workout_plan_id
      WHERE workout_days.id = workout_exercises.workout_day_id
      AND workout_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workout exercises in their plans"
  ON public.workout_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_days
      JOIN public.workout_plans ON workout_plans.id = workout_days.workout_plan_id
      WHERE workout_days.id = workout_exercises.workout_day_id
      AND workout_plans.user_id = auth.uid()
    )
  );

-- RLS Policies for exercise_logs
CREATE POLICY "Users can view their own exercise logs"
  ON public.exercise_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise logs"
  ON public.exercise_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs"
  ON public.exercise_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs"
  ON public.exercise_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add trigger to user_fitness_profiles
CREATE TRIGGER update_user_fitness_profiles_updated_at
  BEFORE UPDATE ON public.user_fitness_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();