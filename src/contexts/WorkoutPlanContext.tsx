import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findExerciseMatches } from "@/lib/fuzzyMatcher";

interface Exercise {
  id: string;
  exercise_order: number;
  exercise_name: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

interface WorkoutDay {
  id: string;
  day_name: string;
  day_order: number;
  exercises: Exercise[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  days: WorkoutDay[];
  conversationId?: string;
}

interface WorkoutPlanContextType {
  workoutPlan: WorkoutPlan | null;
  exerciseMatchCache: Map<string, { imageUrl: string | null; confidence: number }>;
  isLoading: boolean;
  refreshWorkoutPlan: () => Promise<void>;
  clearCache: () => void;
}

const WorkoutPlanContext = createContext<WorkoutPlanContextType | undefined>(undefined);

export const useWorkoutPlan = () => {
  const context = useContext(WorkoutPlanContext);
  if (!context) {
    throw new Error("useWorkoutPlan must be used within WorkoutPlanProvider");
  }
  return context;
};

export const WorkoutPlanProvider = ({ children }: { children: ReactNode }) => {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [exerciseMatchCache, setExerciseMatchCache] = useState<Map<string, { imageUrl: string | null; confidence: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const loadWorkoutPlan = async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setWorkoutPlan(null);
        setIsLoading(false);
        return;
      }

      // Load active workout plan
      const { data: plans } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!plans || plans.length === 0) {
        setWorkoutPlan(null);
        setIsLoading(false);
        return;
      }

      const plan = plans[0];

      // Load conversation if linked
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('workout_plan_id', plan.id)
        .maybeSingle();

      // Load days
      const { data: days } = await supabase
        .from('workout_days')
        .select('*')
        .eq('workout_plan_id', plan.id)
        .order('day_order', { ascending: true });

      if (days) {
        // Load exercises for each day
        const daysWithExercises = await Promise.all(
          days.map(async (day) => {
            const { data: exercises } = await supabase
              .from('workout_exercises')
              .select('*')
              .eq('workout_day_id', day.id)
              .order('exercise_order', { ascending: true });

            return {
              ...day,
              exercises: exercises || []
            };
          })
        );

        setWorkoutPlan({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          days: daysWithExercises,
          conversationId: conversation?.id
        });

        // Pre-load all exercise matches in parallel
        const allExerciseNames = daysWithExercises
          .flatMap(day => day.exercises)
          .map(ex => ex.exercise_name)
          .filter((name): name is string => !!name);

        if (allExerciseNames.length > 0) {
          const matches = await findExerciseMatches(allExerciseNames);
          const cache = new Map<string, { imageUrl: string | null; confidence: number }>();
          
          matches.forEach((match, name) => {
            if (match && match.confidence >= 0.8) {
              const imageUrls = match.exercise.image_urls;
              const imageUrl = imageUrls && imageUrls.length > 0
                ? (imageUrls[0].startsWith('http') ? imageUrls[0] : `https://wger.de${imageUrls[0]}`)
                : null;
              
              cache.set(name, {
                imageUrl,
                confidence: match.confidence
              });
            } else {
              cache.set(name, { imageUrl: null, confidence: 0 });
            }
          });
          
          setExerciseMatchCache(cache);
        }
      }
    } catch (error) {
      console.error('Error loading workout plan:', error);
    } finally {
      setIsLoading(false);
      setHasFetchedOnce(true);
    }
  };

  const refreshWorkoutPlan = async () => {
    await loadWorkoutPlan(true);
  };

  const clearCache = () => {
    setWorkoutPlan(null);
    setExerciseMatchCache(new Map());
    setHasFetchedOnce(false);
  };

  // Load on mount
  useEffect(() => {
    loadWorkoutPlan(true);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadWorkoutPlan(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <WorkoutPlanContext.Provider
      value={{
        workoutPlan,
        exerciseMatchCache,
        isLoading: isLoading && !hasFetchedOnce,
        refreshWorkoutPlan,
        clearCache,
      }}
    >
      {children}
    </WorkoutPlanContext.Provider>
  );
};
