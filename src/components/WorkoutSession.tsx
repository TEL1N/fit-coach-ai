import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Check, X, Play, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  onComplete: () => void;
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
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
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
          // Workout complete
          const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
          const minutes = Math.floor(totalTimeSeconds / 60);
          
          toast({
            title: "Workout complete! 🎉",
            description: `${totalExercises} exercises • ${minutes} minutes`,
          });

          // Haptic feedback for completion
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          onComplete();
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
    setIsResting(false);
    setRestTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentExercise) {
    return null;
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
      <div className="px-6 py-4 bg-card border-b border-border">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 px-6 flex flex-col items-center justify-between min-h-0"
        style={{ 
          paddingTop: '1rem',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' 
        }}
      >
        {isResting ? (
          /* Rest Screen */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm w-full">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              <Timer className="w-16 h-16 text-primary" />
            </div>
            
            <div>
              <p className="text-muted-foreground mb-2">Rest Time</p>
              <p className="text-6xl font-bold tabular-nums">{formatTime(restTimeLeft)}</p>
            </div>

            <div className="space-y-3 w-full">
              <p className="text-sm text-muted-foreground">
                Next: Set {currentSet} of {totalSets}
              </p>
              <Button
                className="w-full h-14 rounded-xl text-lg font-semibold"
                onClick={handleSkipRest}
              >
                Skip Rest
              </Button>
            </div>
          </div>
        ) : (
          /* Exercise Screen */
          <>
            {/* Exercise Image */}
            <div className="w-full max-w-xs aspect-square rounded-3xl bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
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
            <div className="text-center space-y-1 flex-shrink-0">
              <h3 className="text-xl font-bold">
                {currentExercise.exercise_name}
              </h3>
              
              <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm">
                <span>
                  {currentExercise.sets} sets
                </span>
                <span>•</span>
                <span>
                  {currentExercise.reps} reps
                </span>
              </div>

              {currentExercise.notes && (
                <p className="text-xs text-muted-foreground pt-1">
                  {currentExercise.notes}
                </p>
              )}
            </div>

            {/* Set Counter */}
            <Card className="p-4 text-center w-full max-w-xs flex-shrink-0">
              <p className="text-xs text-muted-foreground mb-1">Current Set</p>
              <p className="text-4xl font-bold tabular-nums">
                {currentSet} <span className="text-xl text-muted-foreground">/ {totalSets}</span>
              </p>
            </Card>

            {/* Complete Set Button */}
            <Button
              className="w-full max-w-xs h-14 rounded-xl text-base font-semibold flex-shrink-0"
              onClick={handleCompleteSet}
            >
              <Check className="w-5 h-5 mr-2" />
              Complete Set
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkoutSession;
