import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  isLoading: boolean;
  refreshWorkoutPlan: (force?: boolean) => Promise<void>;
  setWorkoutPlanDirectly: (plan: WorkoutPlan) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  
  // OPTIMIZATION: Prevent duplicate loads
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const cachedPlanIdRef = useRef<string | null>(null);

  const loadWorkoutPlan = useCallback(async (showLoadingState = true, forceRefresh = false) => {
    // OPTIMIZATION: Skip query if we already have this plan cached
    if (!forceRefresh && workoutPlan && cachedPlanIdRef.current === workoutPlan.id) {
      console.log('[WorkoutPlanContext] Plan already cached, skipping query');
      return;
    }

    // OPTIMIZATION: Prevent loads within 500ms of last load (reduced from 5s for better UX)
    // But allow force refresh to bypass this
    const now = Date.now();
    if (!forceRefresh && now - lastLoadTimeRef.current < 500) {
      console.log('[WorkoutPlanContext] Skipping load - too soon after last load');
      return;
    }

    // OPTIMIZATION: Prevent duplicate concurrent loads (unless forced)
    if (!forceRefresh && loadingRef.current) {
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
      const planData = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        days: daysWithExercises,
        conversationId: plan.conversations?.[0]?.id
      };
      
      setWorkoutPlan(planData);
      cachedPlanIdRef.current = plan.id; // Cache plan ID
      setIsLoading(false); // Show plan immediately
      setHasFetchedOnce(true);
      loadingRef.current = false;

      console.log(`[WorkoutPlanContext] Plan visible in ${(performance.now() - overallStartTime).toFixed(0)}ms`);

      // Images removed for performance - plan loads instantly
      // Can be re-added later with lazy loading when images are clicked
    } catch (error) {
      console.error('Error loading workout plan:', error);
      setIsLoading(false);
      setHasFetchedOnce(true);
      loadingRef.current = false;
    }
  }, []); // Add empty dependency array for useCallback

  const refreshWorkoutPlan = useCallback(async (force = false) => {
    await loadWorkoutPlan(true, force);
  }, [loadWorkoutPlan]);

  const setWorkoutPlanDirectly = useCallback((plan: WorkoutPlan) => {
    console.log('[WorkoutPlanContext] Setting plan directly (cached)');
    setWorkoutPlan(plan);
    cachedPlanIdRef.current = plan.id; // Cache plan ID
    setIsLoading(false);
    setHasFetchedOnce(true);
    loadingRef.current = false;
  }, []);

  const clearCache = useCallback(() => {
    setWorkoutPlan(null);
    cachedPlanIdRef.current = null;
    setHasFetchedOnce(false);
  }, []);
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
          isLoading: isLoading && !hasFetchedOnce,
          refreshWorkoutPlan,
          setWorkoutPlanDirectly,
          clearCache,
        }}
      >
        {children}
      </WorkoutPlanContext.Provider>
    );
  };