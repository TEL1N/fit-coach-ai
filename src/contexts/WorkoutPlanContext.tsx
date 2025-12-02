import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
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
  
  // OPTIMIZATION: Prevent duplicate loads
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const loadWorkoutPlan = useCallback(async (showLoadingState = true) => {
    // OPTIMIZATION: Prevent loads within 5 seconds of last load
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 5000) {
      console.log('[WorkoutPlanContext] Skipping load - too soon after last load');
      return;
    }

    // OPTIMIZATION: Prevent duplicate concurrent loads
    if (loadingRef.current) {
      console.log('[WorkoutPlanContext] Load already in progress, skipping...');
      return;
    }

    loadingRef.current = true;
    lastLoadTimeRef.current = now;
    
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
        loadingRef.current = false;
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
        loadingRef.current = false;
        return;
      }

      const plan = plans[0];
      console.log(`[WorkoutPlanContext] Plan + nested data fetched in ${(performance.now() - dbStartTime).toFixed(0)}ms`);

      // Transform nested data structure
      const daysWithExercises = (plan.workout_days || [])
        .sort((a: any, b: any) => a.day_order - b.day_order)
        .map((day: any) => ({
          ...day,
          exercises: (day.workout_exercises || [])
            .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
        }));

      // Set workout plan immediately WITHOUT waiting for images
      setWorkoutPlan({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        days: daysWithExercises,
        conversationId: plan.conversations?.[0]?.id
      });
      setIsLoading(false); // Show plan immediately
      setHasFetchedOnce(true);
      loadingRef.current = false;

      console.log(`[WorkoutPlanContext] Plan visible in ${(performance.now() - overallStartTime).toFixed(0)}ms`);

      // THEN load images in background (don't block UI)
      const allExerciseNames = daysWithExercises
        .flatMap((day: any) => day.exercises)
        .map((ex: any) => ex.exercise_name)
        .filter((name: any): name is string => !!name);

      if (allExerciseNames.length > 0) {
        // This runs in background while user sees the plan
        findExerciseMatches(allExerciseNames).then(matches => {
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
          console.log(`[WorkoutPlanContext] Images loaded in background`);
        });
      }
    } catch (error) {
      console.error('Error loading workout plan:', error);
      setIsLoading(false);
      setHasFetchedOnce(true);
      loadingRef.current = false;
    }
  }, []); // Add empty dependency array for useCallback

  const refreshWorkoutPlan = async () => {
    await loadWorkoutPlan(true);
  };

  const clearCache = () => {
    setWorkoutPlan(null);
    setExerciseMatchCache(new Map());
    setHasFetchedOnce(false);
  };
  // Load ONLY on mount, NEVER reload automatically
  useEffect(() => {
    loadWorkoutPlan(true);
    
    // DON'T listen to auth changes - they cause unnecessary reloads
    // Auth changes are handled at app level, not here
  }, [loadWorkoutPlan]);

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