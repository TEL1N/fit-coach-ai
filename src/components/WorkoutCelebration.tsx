import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";

interface WorkoutCelebrationProps {
  totalExercises: number;
  totalMinutes: number;
  onContinue: () => void;
}

const WorkoutCelebration = ({ totalExercises, totalMinutes, onContinue }: WorkoutCelebrationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setShow(true), 100);

    // Celebration haptic pattern
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <Sparkles 
              className="text-primary/20" 
              size={16 + Math.random() * 24}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div 
        className={`text-center space-y-6 max-w-sm w-full transition-all duration-700 ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Success Icon */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative w-32 h-32 bg-primary rounded-full flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>

        {/* Congratulations Text */}
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h1 className="text-4xl font-bold">Workout Complete!</h1>
          <p className="text-lg text-muted-foreground">
            Amazing work! You crushed it! 💪
          </p>
        </div>

        {/* Stats */}
        <div 
          className="flex items-center justify-center gap-8 py-6 animate-fade-in"
          style={{ animationDelay: '400ms' }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{totalExercises}</p>
            <p className="text-sm text-muted-foreground">Exercises</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{totalMinutes}</p>
            <p className="text-sm text-muted-foreground">Minutes</p>
          </div>
        </div>

        {/* Continue Button */}
        <Button
          className="w-full h-14 rounded-xl text-lg font-semibold animate-fade-in"
          onClick={onContinue}
          style={{ animationDelay: '600ms' }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default WorkoutCelebration;
