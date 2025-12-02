import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import MobileTabBar from "@/components/MobileTabBar";
import EditPlanBottomSheet from "@/components/EditPlanBottomSheet";
import ExerciseEditCard from "@/components/ExerciseEditCard";
import ExerciseCard from "@/components/ExerciseCard";
import WorkoutSession from "@/components/WorkoutSession";
import { useWorkoutPlan } from "@/contexts/WorkoutPlanContext";
import { Calendar, Clock, Dumbbell, Plus, ChevronDown, ChevronUp, MessageSquare, Pencil, Trash2, Play, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const { workoutPlan: contextWorkoutPlan, exerciseMatchCache, isLoading, refreshWorkoutPlan } = useWorkoutPlan();
  const [localWorkoutPlan, setLocalWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [originalPlan, setOriginalPlan] = useState<WorkoutPlan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeWorkoutDayId, setActiveWorkoutDayId] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completedDays, setCompletedDays] = useState<Map<string, Date>>(new Map());

  // Use local copy in edit mode, context otherwise
  const workoutPlan = isEditMode ? localWorkoutPlan : contextWorkoutPlan;

  // Sync local copy when context updates and not in edit mode
  useEffect(() => {
    if (!isEditMode && contextWorkoutPlan) {
      setLocalWorkoutPlan(contextWorkoutPlan);
    }
  }, [contextWorkoutPlan, isEditMode]);

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

  const handleEditWithAI = () => {
    setIsEditSheetOpen(false);
    if (workoutPlan?.conversationId) {
      navigate("/chat", { state: { conversationId: workoutPlan.conversationId } });
    } else {
      toast({
        title: "No chat history found",
        description: "This workout plan doesn't have a linked conversation.",
        variant: "destructive",
      });
    }
  };

  const handleEditManually = () => {
    setIsEditSheetOpen(false);
    setIsEditMode(true);
    setOriginalPlan(workoutPlan);
    setLocalWorkoutPlan(workoutPlan);
    // Expand all days for easier editing
    if (workoutPlan) {
      setExpandedDays(new Set(workoutPlan.days.map(d => d.id)));
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingExerciseId(null);
    // Refresh from context to revert local changes
    refreshWorkoutPlan();
    setOriginalPlan(null);
  };

  const handleSaveChanges = async () => {
    if (!workoutPlan) return;

    try {
      // Update each exercise in the database
      for (const day of workoutPlan.days) {
        for (const exercise of day.exercises) {
          await supabase
            .from('workout_exercises')
            .update({
              exercise_name: exercise.exercise_name,
              sets: exercise.sets,
              reps: exercise.reps,
              rest_seconds: exercise.rest_seconds,
              notes: exercise.notes,
            })
            .eq('id', exercise.id);
        }
      }

      toast({
        title: "Changes saved",
        description: "Your workout plan has been updated successfully.",
      });

      // Refresh workout plan from context
      await refreshWorkoutPlan();
      
      setIsEditMode(false);
      setEditingExerciseId(null);
      setOriginalPlan(null);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateExercise = (dayId: string, exerciseId: string, updates: Partial<Exercise>) => {
    setLocalWorkoutPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map(day =>
          day.id === dayId
            ? {
                ...day,
                exercises: day.exercises.map(ex =>
                  ex.id === exerciseId ? { ...ex, ...updates } : ex
                )
              }
            : day
        )
      };
    });
    setEditingExerciseId(null);
  };

  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    try {
      await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', exerciseId);

      // Refresh from context
      await refreshWorkoutPlan();

      toast({
        title: "Exercise deleted",
        description: "The exercise has been removed from your plan.",
      });
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Error",
        description: "Failed to delete exercise. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async () => {
    if (!workoutPlan) return;

    try {
      // Delete the linked conversation first
      if (workoutPlan.conversationId) {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', workoutPlan.conversationId);
      }

      // Then delete the workout plan
      await supabase
        .from('workout_plans')
        .delete()
        .eq('id', workoutPlan.id);

      toast({
        title: "Plan deleted",
        description: "Your workout plan has been deleted.",
      });

      // Refresh context to clear deleted plan
      await refreshWorkoutPlan();
      setLocalWorkoutPlan(null);
      setIsEditMode(false);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleExerciseComplete = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
      return newSet;
    });
  };

  const handleStartWorkout = (dayId: string) => {
    setActiveWorkoutDayId(dayId);
  };

  const handleWorkoutComplete = (completedExerciseIds: string[]) => {
    if (activeWorkoutDayId) {
      setCompletedDays(prev => new Map(prev).set(activeWorkoutDayId, new Date()));
      
      // Auto-check all exercises in the completed workout
      setCompletedExercises(prev => {
        const newSet = new Set(prev);
        completedExerciseIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    setActiveWorkoutDayId(null);
  };

  const handleExitWorkout = () => {
    setActiveWorkoutDayId(null);
  };

  // Load completed exercises on mount
  useEffect(() => {
    const loadCompletedExercises = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: logs } = await supabase
        .from('exercise_logs')
        .select('workout_exercise_id')
        .eq('user_id', session.user.id)
        .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      if (logs) {
        setCompletedExercises(new Set(logs.map(log => log.workout_exercise_id)));
      }
    };

    loadCompletedExercises();

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
        <div className="shimmer w-12 h-12 rounded-full"></div>
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
      <div 
        className="flex-1 px-6 py-8 overflow-y-auto min-h-0" 
        style={{ 
          paddingBottom: isEditMode 
            ? 'calc(5rem + 4rem + max(1rem, env(safe-area-inset-bottom)))' 
            : 'calc(5rem + max(1rem, env(safe-area-inset-bottom)))' 
        }}
      >
        {workoutPlan ? (
          <>
            {/* Plan Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{workoutPlan.name}</h2>
                </div>
                {!isEditMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex-shrink-0"
                    onClick={() => setIsEditSheetOpen(true)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {workoutPlan.description && (
                <p className="text-muted-foreground">{workoutPlan.description}</p>
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
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                            {completedDays.has(day.id) ? (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : (
                              <span className="text-primary font-semibold">{day.day_order}</span>
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold">{day.day_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {day.exercises.length} exercises
                              {completedDays.has(day.id) && (
                                <span className="ml-2 text-primary">• Completed</span>
                              )}
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
                        {/* Start Workout Button */}
                        {!isEditMode && (
                          <div className="p-4 border-b border-border">
                            <Button
                              className="w-full h-14 rounded-xl text-base font-semibold"
                              onClick={() => handleStartWorkout(day.id)}
                            >
                              <Play className="w-5 h-5 mr-2" />
                              Start Workout
                            </Button>
                          </div>
                        )}

                        {day.exercises.map((exercise, idx) => (
                          <div
                            key={exercise.id}
                            className={`${idx !== day.exercises.length - 1 ? 'border-b border-border' : ''}`}
                          >
                            {isEditMode ? (
                              <ExerciseEditCard
                                exercise={exercise}
                                isEditing={editingExerciseId === exercise.id}
                                onEdit={() => setEditingExerciseId(exercise.id)}
                                onSave={(updates) => handleUpdateExercise(day.id, exercise.id, updates)}
                                onCancel={() => setEditingExerciseId(null)}
                                onDelete={() => handleDeleteExercise(day.id, exercise.id)}
                              />
                            ) : (
                              <div className="p-4 flex items-start gap-3">
                                <Checkbox
                                  checked={completedExercises.has(exercise.id)}
                                  onCheckedChange={() => handleToggleExerciseComplete(exercise.id)}
                                  className="mt-1 h-5 w-5"
                                />
                                <div className="flex-1 min-w-0">
                                  <ExerciseCard
                                    exerciseName={exercise.exercise_name || `Exercise ${exercise.exercise_order}`}
                                    sets={exercise.sets}
                                    reps={exercise.reps}
                                    restSeconds={exercise.rest_seconds}
                                    notes={exercise.notes}
                                    cachedMatch={exercise.exercise_name ? exerciseMatchCache.get(exercise.exercise_name) : undefined}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Add Exercise Button - Only in Edit Mode */}
                        {isEditMode && (
                          <div className="p-4 border-t border-border">
                            <Button
                              variant="outline"
                              className="w-full h-12 rounded-xl border-dashed"
                              onClick={async () => {
                                const newOrder = day.exercises.length + 1;
                                const { data: newExercise } = await supabase
                                  .from('workout_exercises')
                                  .insert({
                                    workout_day_id: day.id,
                                    exercise_name: 'New Exercise',
                                    exercise_order: newOrder,
                                    sets: 3,
                                    reps: '10',
                                    rest_seconds: 60,
                                  })
                                  .select()
                                  .single();

                                 if (newExercise) {
                                   setLocalWorkoutPlan(prev => {
                                     if (!prev) return prev;
                                     return {
                                       ...prev,
                                       days: prev.days.map(d =>
                                         d.id === day.id
                                           ? { ...d, exercises: [...d.exercises, newExercise as Exercise] }
                                           : d
                                       )
                                     };
                                   });
                                   setEditingExerciseId(newExercise.id);
                                 }
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Exercise
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>

            {/* Delete Plan Button - Only in Edit Mode */}
            {isEditMode && (
              <div className="mt-8 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Plan
                </Button>
              </div>
            )}
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

      {/* Fixed Edit Mode Actions - Above Tab Bar */}
      {isEditMode && (
        <div 
          className="fixed left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border px-6 py-4 flex gap-3 z-40"
          style={{ 
            bottom: 'calc(4rem + env(safe-area-inset-bottom))',
          }}
        >
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl font-medium"
            onClick={handleCancelEdit}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl font-medium"
            onClick={handleSaveChanges}
          >
            Save Changes
          </Button>
        </div>
      )}

      <EditPlanBottomSheet
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        onEditWithAI={handleEditWithAI}
        onEditManually={handleEditManually}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Workout Session Modal */}
      {activeWorkoutDayId && workoutPlan && (
        <WorkoutSession
          dayName={workoutPlan.days.find(d => d.id === activeWorkoutDayId)?.day_name || ''}
          exercises={workoutPlan.days
            .find(d => d.id === activeWorkoutDayId)?.exercises
            .map(ex => ({
              ...ex,
              imageUrl: ex.exercise_name ? exerciseMatchCache.get(ex.exercise_name)?.imageUrl || null : null,
            })) || []
          }
          onComplete={handleWorkoutComplete}
          onExit={handleExitWorkout}
        />
      )}

      {!activeWorkoutDayId && <MobileTabBar />}
    </div>
  );
};

export default Workouts;