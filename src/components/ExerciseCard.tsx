import { useEffect, useState, useMemo } from "react";
import { Dumbbell } from "lucide-react";
import { findExerciseMatch } from "@/lib/fuzzyMatcher";

interface ExerciseCardProps {
  exerciseName: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  showImage?: boolean;
  cachedMatch?: { imageUrl: string | null; confidence: number } | null;
}

const ExerciseCard = ({
  exerciseName,
  sets,
  reps,
  restSeconds,
  notes,
  showImage = true,
  cachedMatch,
}: ExerciseCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(cachedMatch?.imageUrl || null);
  const [isLoading, setIsLoading] = useState(!cachedMatch);
  const [confidence, setConfidence] = useState<number>(cachedMatch?.confidence || 0);

  useEffect(() => {
    // Skip if we have cached data
    if (cachedMatch) {
      setImageUrl(cachedMatch.imageUrl);
      setConfidence(cachedMatch.confidence);
      setIsLoading(false);
      return;
    }

    const loadExerciseMatch = async () => {
      if (!exerciseName || !showImage) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const match = await findExerciseMatch(exerciseName);
        
        if (!match) {
          console.warn('❌ No match found:', {
            exerciseName,
            reason: 'No WGER exercise matched'
          });
          setIsLoading(false);
          return;
        }

        console.log('🔍 Exercise match found:', {
          originalName: exerciseName,
          matchedName: match.exercise.name,
          confidence: `${(match.confidence * 100).toFixed(0)}%`,
          hasImages: !!match.exercise.image_urls && match.exercise.image_urls.length > 0,
          imageCount: match.exercise.image_urls?.length || 0,
          wgerId: match.exercise.wger_id
        });
        
        if (match.confidence >= 0.8) {
          // Get the first image URL if available
          const imageUrls = match.exercise.image_urls;
          if (imageUrls && imageUrls.length > 0) {
            // WGER images are relative paths, prepend base URL
            const fullUrl = imageUrls[0].startsWith('http') 
              ? imageUrls[0] 
              : `https://wger.de${imageUrls[0]}`;
            setImageUrl(fullUrl);
            console.log('✅ Image loaded:', {
              exerciseName,
              imageUrl: fullUrl
            });
          } else {
            console.warn('⚠️ Match found but no images available:', {
              exerciseName,
              matchedName: match.exercise.name,
              confidence: `${(match.confidence * 100).toFixed(0)}%`,
              reason: 'WGER exercise has no images'
            });
          }
          setConfidence(match.confidence);
        } else {
          console.warn('⚠️ Low confidence match (< 80%):', {
            exerciseName,
            matchedName: match.exercise.name,
            confidence: `${(match.confidence * 100).toFixed(0)}%`,
            hasImages: !!match.exercise.image_urls && match.exercise.image_urls.length > 0,
            reason: 'Confidence too low to use'
          });
        }
      } catch (error) {
        console.error('❌ Error finding exercise match:', {
          exerciseName,
          error
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadExerciseMatch();
  }, [exerciseName, showImage, cachedMatch]);

  return (
    <div className="flex gap-3">
      {/* Exercise Image or Placeholder */}
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={exerciseName}
            className="w-full h-full object-cover"
            onError={() => {
              console.warn(`Failed to load image for: ${exerciseName}`);
              setImageUrl(null);
            }}
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
      </div>
    </div>
  );
};

export default ExerciseCard;
