import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileTabBar from "@/components/MobileTabBar";
import { Calendar, Clock, Dumbbell, Plus, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

const Workouts = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const loadWorkoutPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
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

      if (plans && plans.length > 0) {
        const plan = plans[0];
        
        // Find the conversation that created this plan
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('workout_plan_id', plan.id)
          .eq('user_id', session.user.id)
          .single();
        
        // Load workout days
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
        }
      }

      setIsLoading(false);
    };

    loadWorkoutPlan();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden transition-all duration-300 ease-out">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5 flex-shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <p className="text-sm text-muted-foreground">Your personalized training plans</p>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 px-6 py-8 overflow-y-auto min-h-0" style={{ paddingBottom: 'calc(5rem + max(1rem, env(safe-area-inset-bottom)))' }}>
        {workoutPlan ? (
          <>
            {/* Plan Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-3">{workoutPlan.name}</h2>
              {workoutPlan.description && (
                <p className="text-muted-foreground mb-4">{workoutPlan.description}</p>
              )}
              
              {/* Edit with AI button */}
              {workoutPlan.conversationId && (
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl mt-4"
                  onClick={() => navigate("/chat", { 
                    state: { conversationId: workoutPlan.conversationId } 
                  })}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Edit with AI Coach
                </Button>
              )}
            </div>

            {/* Workout Days */}
            <div className="space-y-4">
              {workoutPlan.days.map((day) => (
                <Collapsible
                  key={day.id}
                  open={expandedDays.has(day.id)}
                  onOpenChange={() => toggleDay(day.id)}
                >
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">{day.day_order}</span>
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold">{day.day_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {day.exercises.length} exercises
                            </p>
                          </div>
                        </div>
                        {expandedDays.has(day.id) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t border-border">
                        {day.exercises.map((exercise, idx) => (
                          <div
                            key={exercise.id}
                            className={`p-4 ${idx !== day.exercises.length - 1 ? 'border-b border-border' : ''}`}
                          >
                            <div className="flex gap-3">
                              {/* Placeholder for exercise image */}
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Dumbbell className="w-6 h-6 text-muted-foreground" />
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="font-semibold text-base mb-1">
                                  {exercise.exercise_name || `Exercise ${exercise.exercise_order}`}
                                </h4>
                                <div className="flex items-center gap-3 text-sm mb-1">
                                  {exercise.sets && exercise.reps && (
                                    <span className="font-medium">
                                      {exercise.sets} × {exercise.reps}
                                    </span>
                                  )}
                                  {exercise.rest_seconds && (
                                    <span className="text-muted-foreground">
                                      {exercise.rest_seconds} sec rest
                                    </span>
                                  )}
                                </div>
                                {exercise.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {exercise.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </>
        ) : (
          /* Empty State */
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Workout Plans Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Chat with your AI coach to create your first personalized workout plan!
            </p>
            <Button 
              className="w-full h-12 rounded-xl"
              onClick={() => navigate("/chat")}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Workout Plan
            </Button>
          </Card>
        )}
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Workouts;