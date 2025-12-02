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
        <div className="flex gap-3 hover:bg-white/5 transition-all duration-200 rounded-xl p-2 -m-2 cursor-pointer active:scale-[0.98]">
          {/* Exercise Image or Placeholder with Glow */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden relative ${
            imageUrl ? 'shadow-glow-sm' : ''
          }`}>
            <div className={`absolute inset-0 ${imageUrl ? 'gradient-primary opacity-20' : 'bg-muted'}`}></div>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={exerciseName}
                loading="lazy"
                className="w-full h-full object-cover relative z-10"
                style={{ 
                  imageRendering: 'crisp-edges',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)'
                }}
              />
            ) : (
              <Dumbbell className="w-6 h-6 text-muted-foreground relative z-10" />
            )}
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

      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden glass-strong border-white/20 shadow-floating">
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsModalOpen(false)}
            className="w-8 h-8 rounded-full glass-card border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Exercise Image with Premium Glow */}
        <div className="w-full aspect-square flex items-center justify-center overflow-hidden relative bg-black/20">
          <div className={`absolute inset-0 ${imageUrl ? 'gradient-energy opacity-30 blur-2xl' : 'bg-muted'}`}></div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={exerciseName}
              loading="eager"
              className="w-full h-full object-contain relative z-10 shadow-glow-lg"
              style={{ 
                imageRendering: 'auto',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
              }}
            />
          ) : (
            <div className="relative z-10 w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-glow-md">
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
          )}
        </div>

        {/* Exercise Details with Glassmorphism */}
        <div className="p-6 space-y-4 relative">
          <div className="absolute inset-0 gradient-primary opacity-5"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-3 tracking-tight">{exerciseName}</h3>
            <div className="flex items-center gap-4">
              {sets && reps && (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl gradient-primary shadow-glow-sm">
                    <span className="text-2xl font-black text-white">{sets}</span>
                  </div>
                  <span className="text-muted-foreground font-medium">sets</span>
                  <span className="text-lg text-muted-foreground">×</span>
                  <div className="px-3 py-1.5 rounded-xl gradient-secondary shadow-glow-sm">
                    <span className="text-2xl font-black text-white">{reps}</span>
                  </div>
                  <span className="text-muted-foreground font-medium">reps</span>
                </div>
              )}
            </div>
          </div>

          {restSeconds && (
            <div className="relative z-10 flex items-center gap-2 py-3 px-4 glass-card border-white/10 rounded-xl">
              <span className="text-sm text-muted-foreground font-semibold">Rest:</span>
              <span className="text-base font-black text-primary">{formatRestTime(restSeconds)}</span>
            </div>
          )}

          {notes && (
            <div className="relative z-10 pt-2 border-t border-white/10">
              <p className="text-xs font-bold text-primary uppercase mb-2 tracking-wider">Form Tips</p>
              <p className="text-sm leading-relaxed">{notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseCard;
