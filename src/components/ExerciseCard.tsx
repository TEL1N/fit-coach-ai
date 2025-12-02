import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  showImage = true,
  cachedMatch,
  isExpanded = false,
  onToggleExpand,
}: ExerciseCardProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(cachedMatch?.imageUrl || null);
  const [isLoading, setIsLoading] = useState(!cachedMatch);
  const [confidence, setConfidence] = useState<number>(cachedMatch?.confidence || 0);
  const [exerciseDetails, setExerciseDetails] = useState<{
    description: string | null;
    equipment: string[] | null;
    muscles: string[] | null;
    category: string | null;
  } | null>(null);

  useEffect(() => {
    const loadExerciseDetails = async () => {
      if (!exerciseName || !isExpanded || exerciseDetails) return;

      try {
        const { data: exercise } = await supabase
          .from('exercises')
          .select('description, equipment, muscles, category')
          .ilike('name', exerciseName)
          .maybeSingle();

        if (exercise) {
          setExerciseDetails(exercise);
        }
      } catch (error) {
        console.error('Error loading exercise details:', error);
      }
    };

    loadExerciseDetails();
  }, [exerciseName, isExpanded, exerciseDetails]);

  useEffect(() => {
    // Skip if we have cached data
    if (cachedMatch) {
      setImageUrl(cachedMatch.imageUrl);
      setConfidence(cachedMatch.confidence);
      setIsLoading(false);
      return;
    }

    const loadExerciseImage = async () => {
      if (!exerciseName || !showImage) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: exercise } = await supabase
          .from('exercises')
          .select('image_urls')
          .ilike('name', exerciseName)
          .maybeSingle();

        if (exercise?.image_urls && exercise.image_urls.length > 0) {
          const fullUrl = exercise.image_urls[0].startsWith('http')
            ? exercise.image_urls[0]
            : `https://wger.de${exercise.image_urls[0]}`;
          setImageUrl(fullUrl);
          setConfidence(1);
        }
      } catch (error) {
        console.error('Error loading exercise image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExerciseImage();
  }, [exerciseName, showImage, cachedMatch]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand} className="w-full">
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex gap-3 hover:bg-muted/30 transition-colors rounded-lg p-2 -m-2">
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
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-base mb-1 flex-1">
                {exerciseName}
              </h4>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              )}
            </div>
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
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {/* Notes */}
          {notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
              <p className="text-sm">{notes}</p>
            </div>
          )}

          {/* Exercise Details from WGER */}
          {exerciseDetails && (
            <>
              {exerciseDetails.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: exerciseDetails.description }} />
                </div>
              )}

              {exerciseDetails.muscles && exerciseDetails.muscles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Muscles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exerciseDetails.muscles.map((muscle, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exerciseDetails.equipment && exerciseDetails.equipment.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exerciseDetails.equipment.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-muted text-foreground text-xs rounded-md"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exerciseDetails.category && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Category</p>
                  <p className="text-sm">{exerciseDetails.category}</p>
                </div>
              )}
            </>
          )}

          {/* Loading state for details */}
          {!exerciseDetails && isExpanded && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
              <span>Loading exercise details...</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ExerciseCard;
