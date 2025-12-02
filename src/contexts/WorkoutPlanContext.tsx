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
    const overallStartTime = performance.now();
    console.log('[WorkoutPlanContext] Starting workout plan load...');
    
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

      // Load active workout plan with nested data (1 query instead of 3+)
      const dbStartTime = performance.now();
      const { data: plans } = await supabase
        .from('workout_plans')
        .select(`
          *,
          conversations(id),
          workout_days(
            *,
            workout_exercises(
              *
            )
          )
        `)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!plans || plans.length === 0) {
        console.log('[WorkoutPlanContext] No active plan found');
        setWorkoutPlan(null);
        setIsLoading(false);
        return;
      }

      const plan = plans[0];
      console.log(`[WorkoutPlanContext] Plan + nested data fetched in ${(performance.now() - dbStartTime).toFixed(0)}ms`);

      // Transform nested data structure
      const daysWithExercises = (plan.workout_days || [])
        .sort((a, b) => a.day_order - b.day_order)
        .map(day => ({
          ...day,
          exercises: (day.workout_exercises || [])
            .sort((a, b) => a.exercise_order - b.exercise_order)
        }));

      // Set workout plan immediately so UI can start rendering
      setWorkoutPlan({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        days: daysWithExercises,
        conversationId: plan.conversations?.[0]?.id
      });
      console.log(`[WorkoutPlanContext] Plan state set in ${(performance.now() - overallStartTime).toFixed(0)}ms`);

      // Pre-load all exercise matches in parallel
      const matchStartTime = performance.now();
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
        console.log(`[WorkoutPlanContext] Exercise matching complete in ${(performance.now() - matchStartTime).toFixed(0)}ms`);
      }
      
      const totalTime = performance.now() - overallStartTime;
      console.log(`[WorkoutPlanContext] ✅ Total load time: ${totalTime.toFixed(0)}ms`);
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
