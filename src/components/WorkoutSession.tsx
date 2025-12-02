import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Check, X, Play, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import WorkoutCelebration from "@/components/WorkoutCelebration";

interface Exercise {
  id: string;
  exercise_name: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
  imageUrl: string | null;
}

interface WorkoutSessionProps {
  dayName: string;
  exercises: Exercise[];
  onComplete: (completedExerciseIds: string[]) => void;
  onExit: () => void;
}

const WorkoutSession = ({ dayName, exercises, onComplete, onExit }: WorkoutSessionProps) => {
  const { toast } = useToast();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);

  const currentExercise = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;
  const totalSets = currentExercise?.sets || 1;
  const progress = ((currentExerciseIndex * totalSets + currentSet - 1) / (totalExercises * totalSets)) * 100;

  // Rest timer effect
  useEffect(() => {
    if (!isResting || restTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          setIsResting(false);
          // Haptic feedback on rest completion
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isResting, restTimeLeft]);

  // Keep screen awake during workout
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake lock failed:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  const handleCompleteSet = async () => {
    // Enhanced haptic feedback for set completion
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }

    if (currentSet < totalSets) {
      // Move to next set
      setCurrentSet(currentSet + 1);
      
      // Start rest timer
      const restSeconds = currentExercise?.rest_seconds || 60;
      setRestTimeLeft(restSeconds);
      setIsResting(true);
    } else {
      // Exercise complete, save log
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('exercise_logs').insert({
            user_id: session.user.id,
            workout_exercise_id: currentExercise.id,
            sets_completed: totalSets,
            completed_at: new Date().toISOString(),
          });
        }

        setCompletedExercises(prev => new Set(prev).add(currentExercise.id));

        // Move to next exercise or complete workout
        if (currentExerciseIndex < totalExercises - 1) {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setCurrentSet(1);
          setIsResting(false);
          
          toast({
            title: "Exercise complete!",
            description: "Great job! Moving to next exercise.",
          });
        } else {
          // Workout complete - show celebration
          const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
          const minutes = Math.floor(totalTimeSeconds / 60);
          
          // Strong haptic feedback for workout completion
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100, 50, 200]);
          }

          setShowCelebration(true);
        }
      } catch (error) {
        console.error('Error logging exercise:', error);
        toast({
          title: "Error",
          description: "Failed to save workout progress.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSkipRest = () => {
    // Light haptic feedback for skip
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    setIsResting(false);
    setRestTimeLeft(0);
  };

  const handleCelebrationComplete = () => {
    const completedIds = Array.from(completedExercises);
    onComplete(completedIds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentExercise) {
    return null;
  }

  // Show celebration screen
  if (showCelebration) {
    const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalTimeSeconds / 60);

    return (
      <WorkoutCelebration
        totalExercises={totalExercises}
        totalMinutes={minutes}
        onContinue={handleCelebrationComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div 
        className="bg-card border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{dayName}</h2>
          <p className="text-sm text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="h-10 w-10 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-card border-b border-border flex-shrink-0">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content - Centered, no scroll */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        {isResting ? (
          /* Rest Screen */
          <div className="text-center space-y-6 max-w-sm w-full">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Timer className="w-12 h-12 text-primary" />
            </div>
            
            <div>
              <p className="text-muted-foreground mb-2">Rest Time</p>
              <p className="text-6xl font-bold tabular-nums">{formatTime(restTimeLeft)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Next: Set {currentSet} of {totalSets}
              </p>
            </div>
          </div>
        ) : (
          /* Exercise Screen */
          <div className="space-y-6 max-w-sm w-full">
            {/* Exercise Image */}
            <div className="w-full aspect-square rounded-3xl bg-muted overflow-hidden flex items-center justify-center max-h-64">
              {currentExercise.imageUrl ? (
                <img
                  src={currentExercise.imageUrl}
                  alt={currentExercise.exercise_name || 'Exercise'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl">💪</div>
              )}
            </div>

            {/* Exercise Details */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">
                {currentExercise.exercise_name}
              </h3>
              
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <span className="text-lg">
                  {currentExercise.sets} sets
                </span>
                <span>•</span>
                <span className="text-lg">
                  {currentExercise.reps} reps
                </span>
              </div>

              {currentExercise.notes && (
                <p className="text-sm text-muted-foreground pt-2">
                  {currentExercise.notes}
                </p>
              )}
            </div>

            {/* Set Counter */}
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Current Set</p>
              <p className="text-5xl font-bold tabular-nums">
                {currentSet} <span className="text-2xl text-muted-foreground">/ {totalSets}</span>
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Button */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border px-6 py-4 z-50"
        style={{ 
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' 
        }}
      >
        {isResting ? (
          <Button
            className="w-full h-14 rounded-xl text-lg font-semibold"
            onClick={handleSkipRest}
          >
            Skip Rest
          </Button>
        ) : (
          <Button
            className="w-full h-14 rounded-xl text-lg font-semibold"
            onClick={handleCompleteSet}
          >
            <Check className="w-6 h-6 mr-2" />
            Complete Set
          </Button>
        )}
      </div>
    </div>
  );
};

export default WorkoutSession;
