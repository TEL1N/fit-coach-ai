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
  const hasFetchedOnceRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null); // Track current user to prevent cross-user cache

  const loadWorkoutPlan = useCallback(async (showLoadingState = true, forceRefresh = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || null;
    
    // CRITICAL: Clear cache if user changed (prevents showing wrong user's plan)
    if (currentUserIdRef.current && currentUserIdRef.current !== currentUserId) {
      console.log('[WorkoutPlanContext] User changed, clearing cache');
      setWorkoutPlan(null);
      cachedPlanIdRef.current = null;
      setHasFetchedOnce(false);
      hasFetchedOnceRef.current = false;
      loadingRef.current = false;
    }
    currentUserIdRef.current = currentUserId;
    
    // OPTIMIZATION: Skip query if we already have this plan cached and it's the same plan
    // BUT only if user hasn't changed
    const currentPlanId = cachedPlanIdRef.current;
    if (!forceRefresh && currentPlanId && !loadingRef.current && hasFetchedOnceRef.current && currentUserId === currentUserIdRef.current) {
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
      if (!session) {
        setWorkoutPlan(null);
        setIsLoading(false);
        loadingRef.current = false;
        cachedPlanIdRef.current = null;
        return;
      }

      // Load active workout plan with nested data (1 query instead of 3+)
      // CRITICAL: Always filter by user_id to prevent cross-user data leaks
      const dbStartTime = performance.now();
      const { data: plans, error: queryError } = await supabase
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
        .eq('user_id', session.user.id) // CRITICAL: Always filter by current user
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (queryError) {
        console.error('[WorkoutPlanContext] Query error:', queryError);
        throw queryError;
      }

      if (!plans || plans.length === 0) {
        console.log('[WorkoutPlanContext] No active plan found for user:', session.user.id);
        setWorkoutPlan(null);
        setIsLoading(false);
        loadingRef.current = false;
        cachedPlanIdRef.current = null; // Clear cache when no plan found
        return;
      }

      const plan = plans[0];
      
      // CRITICAL: Double-check user_id matches (defense in depth)
      if (plan.user_id !== session.user.id) {
        console.error('[WorkoutPlanContext] SECURITY: Plan user_id mismatch!', {
          planUserId: plan.user_id,
          currentUserId: session.user.id
        });
        setWorkoutPlan(null);
        setIsLoading(false);
        loadingRef.current = false;
        cachedPlanIdRef.current = null;
        return;
      }
      
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
      currentUserIdRef.current = session.user.id; // Cache user ID
      setIsLoading(false); // Show plan immediately
      setHasFetchedOnce(true);
      hasFetchedOnceRef.current = true;
      loadingRef.current = false;

      console.log(`[WorkoutPlanContext] Plan visible in ${(performance.now() - overallStartTime).toFixed(0)}ms`);

      // Images removed for performance - plan loads instantly
      // Can be re-added later with lazy loading when images are clicked
    } catch (error) {
      console.error('Error loading workout plan:', error);
      setIsLoading(false);
      setHasFetchedOnce(true);
      hasFetchedOnceRef.current = true;
      loadingRef.current = false;
    }
  }, []); // Empty deps - function is stable

  const refreshWorkoutPlan = useCallback(async (force = false) => {
    await loadWorkoutPlan(true, force);
  }, [loadWorkoutPlan]);

  const setWorkoutPlanDirectly = useCallback((plan: WorkoutPlan) => {
    console.log('[WorkoutPlanContext] Setting plan directly (cached)');
    setWorkoutPlan(plan);
    cachedPlanIdRef.current = plan.id; // Cache plan ID
    setIsLoading(false);
    setHasFetchedOnce(true);
    hasFetchedOnceRef.current = true;
    loadingRef.current = false;
  }, []);

  const clearCache = useCallback(() => {
    console.log('[WorkoutPlanContext] Clearing cache');
    setWorkoutPlan(null);
    cachedPlanIdRef.current = null;
    currentUserIdRef.current = null;
    setHasFetchedOnce(false);
    hasFetchedOnceRef.current = false;
    loadingRef.current = false;
  }, []);
  
  // Load on mount and clear cache on auth changes
  useEffect(() => {
    // Only load once on mount - use ref to track if we've loaded
    if (!hasFetchedOnceRef.current) {
      loadWorkoutPlan(true);
    }
    
    // CRITICAL: Listen to auth changes to clear cache when user changes
    // This prevents showing one user's plan to another user
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        console.log('[WorkoutPlanContext] Auth state changed:', event);
        clearCache();
        // Reload if user is still signed in (USER_UPDATED case)
        if (session?.user && event === 'USER_UPDATED') {
          // Small delay to ensure state is updated
          setTimeout(() => {
            hasFetchedOnceRef.current = false;
            loadWorkoutPlan(true, true);
          }, 100);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // New user signed in - clear cache and load their plan
        console.log('[WorkoutPlanContext] New user signed in, clearing cache');
        clearCache();
        hasFetchedOnceRef.current = false;
        loadWorkoutPlan(true, true);
      }
    });
    
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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