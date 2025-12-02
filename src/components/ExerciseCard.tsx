import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { findExerciseMatch } from "@/lib/fuzzyMatcher";

interface ExerciseCardProps {
  exerciseName: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  showImage?: boolean;
}

const ExerciseCard = ({
  exerciseName,
  sets,
  reps,
  restSeconds,
  notes,
  showImage = true,
}: ExerciseCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confidence, setConfidence] = useState<number>(0);

  useEffect(() => {
    const loadExerciseMatch = async () => {
      if (!exerciseName || !showImage) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const match = await findExerciseMatch(exerciseName);
        
        if (match && match.confidence >= 0.8) {
          // Get the first image URL if available
          const imageUrls = match.exercise.image_urls;
          if (imageUrls && imageUrls.length > 0) {
            // WGER images are relative paths, prepend base URL
            const fullUrl = imageUrls[0].startsWith('http') 
              ? imageUrls[0] 
              : `https://wger.de${imageUrls[0]}`;
            setImageUrl(fullUrl);
          }
          setConfidence(match.confidence);
        }
      } catch (error) {
        console.error('Error finding exercise match:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExerciseMatch();
  }, [exerciseName, showImage]);

  return (
    <div className="flex gap-3">
      {/* Exercise Image or Placeholder */}
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full animate-pulse bg-muted" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={exerciseName}
            className="w-full h-full object-cover"
            onError={() => setImageUrl(null)}
          />
        ) : (
          <Dumbbell className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Exercise Details */}
      <div className="flex-1">
        <h4 className="font-semibold text-base mb-1">
          {exerciseName}
        </h4>
        <div className="flex items-center gap-3 text-sm mb-1">
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
        {notes && (
          <p className="text-sm text-muted-foreground mt-2">
            {notes}
          </p>
        )}
        {/* Debug: Show confidence score */}
        {confidence > 0 && confidence < 1 && (
          <span className="text-xs text-muted-foreground">
            Match: {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
};

export default ExerciseCard;
