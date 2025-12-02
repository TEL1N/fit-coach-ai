import { useState, memo } from "react";
import { Dumbbell, X, ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExerciseCardProps {
  exerciseName: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
}

const ExerciseCard = memo(({
  exerciseName,
  sets,
  reps,
  restSeconds,
  notes,
}: ExerciseCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <div className="flex gap-3 hover:bg-white/5 transition-colors rounded-xl p-2 -m-2 cursor-pointer">
          {/* Icon Placeholder - No Images */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 bg-muted">
            <Dumbbell className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Exercise Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base mb-1 tracking-tight">
              {exerciseName}
            </h4>
            <div className="flex items-center gap-3 text-sm">
              {sets && reps && (
                <span className="font-bold text-primary">
                  {sets} × {reps}
                </span>
              )}
              {restSeconds && (
                <span className="text-muted-foreground font-medium">
                  {restSeconds}s rest
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-sm p-0 gap-0">
        {/* Header with close button */}
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Icon Placeholder - Images Coming Soon */}
        <div className="w-full aspect-square flex flex-col items-center justify-center bg-muted">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageOff className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Images coming soon</span>
          </div>
        </div>

        {/* Exercise Details - Simplified */}
        <div className="p-5 space-y-3">
          <h3 className="text-xl font-bold">{exerciseName}</h3>
          
          {sets && reps && (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-md bg-primary/10">
                <span className="text-lg font-bold text-primary">{sets}</span>
                <span className="text-xs text-muted-foreground ml-1">sets</span>
              </div>
              <span className="text-muted-foreground text-sm">×</span>
              <div className="px-3 py-1.5 rounded-md bg-secondary/10">
                <span className="text-lg font-bold text-primary">{reps}</span>
                <span className="text-xs text-muted-foreground ml-1">reps</span>
              </div>
            </div>
          )}

          {restSeconds && (
            <div className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">Rest:</span>
              <span className="text-sm font-semibold text-primary">{formatRestTime(restSeconds)}</span>
            </div>
          )}

          {notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Form Tips</p>
              <p className="text-xs text-foreground">{notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

export default ExerciseCard;
