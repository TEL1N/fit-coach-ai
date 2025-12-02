import { useState, useEffect } from "react";
import { Trash2, GripVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ExerciseCard from "@/components/ExerciseCard";

interface Exercise {
  id: string;
  exercise_order: number;
  exercise_name: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

interface ExerciseEditCardProps {
  exercise: Exercise;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updated: Partial<Exercise>) => void;
  onDoneEditing: () => void;
  onDelete: () => void;
}

const ExerciseEditCard = ({
  exercise,
  isEditing,
  onEdit,
  onUpdate,
  onDoneEditing,
  onDelete,
}: ExerciseEditCardProps) => {
  const [editedExercise, setEditedExercise] = useState(exercise);
  
  // Reset edited exercise when the exercise prop changes or when editing starts
  useEffect(() => {
    setEditedExercise(exercise);
  }, [exercise, isEditing]);

  // Update parent state when field changes (on blur)
  const handleFieldBlur = () => {
    onUpdate(editedExercise);
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Exercise Name
            </label>
            <Input
              value={editedExercise.exercise_name || ""}
              onChange={(e) =>
                setEditedExercise({ ...editedExercise, exercise_name: e.target.value })
              }
              onBlur={handleFieldBlur}
              className="h-10"
              placeholder="e.g., Bench Press"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sets
              </label>
              <Input
                type="number"
                value={editedExercise.sets || ""}
                onChange={(e) =>
                  setEditedExercise({
                    ...editedExercise,
                    sets: parseInt(e.target.value) || null,
                  })
                }
                onBlur={handleFieldBlur}
                className="h-10"
                placeholder="3"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Reps
              </label>
              <Input
                value={editedExercise.reps || ""}
                onChange={(e) =>
                  setEditedExercise({ ...editedExercise, reps: e.target.value })
                }
                onBlur={handleFieldBlur}
                className="h-10"
                placeholder="8-12"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Rest (seconds)
            </label>
            <Input
              type="number"
              value={editedExercise.rest_seconds || ""}
              onChange={(e) =>
                setEditedExercise({
                  ...editedExercise,
                  rest_seconds: parseInt(e.target.value) || null,
                })
              }
              onBlur={handleFieldBlur}
              className="h-10"
              placeholder="60"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Notes
            </label>
            <Textarea
              value={editedExercise.notes || ""}
              onChange={(e) =>
                setEditedExercise({ ...editedExercise, notes: e.target.value })
              }
              onBlur={handleFieldBlur}
              className="min-h-[60px] resize-none"
              placeholder="Form cues, tips, etc."
            />
          </div>

          {/* Done button to collapse this exercise */}
          <Button
            onClick={onDoneEditing}
            variant="outline"
            className="w-full h-10 rounded-xl"
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex gap-3">
      {/* Drag Handle */}
      <div className="flex items-start pt-2 cursor-move">
        <GripVertical className="w-5 h-5 text-muted-foreground/40" />
      </div>

      {/* Exercise Card with Image */}
      <div className="flex-1" onClick={onEdit}>
        <ExerciseCard
          exerciseName={exercise.exercise_name || `Exercise ${exercise.exercise_order}`}
          sets={exercise.sets}
          reps={exercise.reps}
          restSeconds={exercise.rest_seconds}
          notes={exercise.notes}
        />
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ExerciseEditCard;
