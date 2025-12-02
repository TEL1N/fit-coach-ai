import { useState } from "react";
import { Dumbbell, X } from "lucide-react";
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
  showImage?: boolean;
  cachedMatch?: { imageUrl: string | null; confidence: number } | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const ExerciseCard = ({
  exerciseName,
  sets,
  reps,
  restSeconds,
  notes,
  cachedMatch,
}: ExerciseCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageUrl = cachedMatch?.imageUrl || null;

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
        <div className="flex gap-3 hover:bg-muted/30 transition-colors rounded-lg p-2 -m-2 cursor-pointer active:scale-[0.98]">
          {/* Exercise Image or Placeholder */}
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={exerciseName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Dumbbell className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Exercise Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base mb-1">
              {exerciseName}
            </h4>
            <div className="flex items-center gap-3 text-sm">
              {sets && reps && (
                <span className="font-medium">
                  {sets} × {reps}
                </span>
              )}
              {restSeconds && (
                <span className="text-muted-foreground">
                  {restSeconds} sec rest
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsModalOpen(false)}
            className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Exercise Image */}
        <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={exerciseName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Dumbbell className="w-20 h-20 text-muted-foreground" />
          )}
        </div>

        {/* Exercise Details */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold mb-2">{exerciseName}</h3>
            <div className="flex items-center gap-4 text-muted-foreground">
              {sets && reps && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{sets}</span>
                  <span className="text-sm">sets</span>
                  <span className="text-lg">×</span>
                  <span className="text-2xl font-bold text-primary">{reps}</span>
                  <span className="text-sm">reps</span>
                </div>
              )}
            </div>
          </div>

          {restSeconds && (
            <div className="flex items-center gap-2 py-3 px-4 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Rest:</span>
              <span className="text-base font-semibold">{formatRestTime(restSeconds)}</span>
            </div>
          )}

          {notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Form Tips</p>
              <p className="text-sm leading-relaxed">{notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseCard;
