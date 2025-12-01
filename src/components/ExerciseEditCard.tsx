import { useState } from "react";
import { Dumbbell, Trash2, GripVertical, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  onSave: (updated: Partial<Exercise>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const ExerciseEditCard = ({
  exercise,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: ExerciseEditCardProps) => {
  const [editedExercise, setEditedExercise] = useState(exercise);

  const handleSave = () => {
    onSave(editedExercise);
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
              className="min-h-[60px] resize-none"
              placeholder="Form cues, tips, etc."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1 h-10 rounded-xl"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 h-10 rounded-xl"
              size="sm"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
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

      {/* Exercise Image Placeholder */}
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Dumbbell className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Exercise Details */}
      <div className="flex-1" onClick={onEdit}>
        <h4 className="font-semibold text-base mb-1">
          {exercise.exercise_name || `Exercise ${exercise.exercise_order}`}
        </h4>
        <div className="flex items-center gap-3 text-sm mb-1">
          {exercise.sets && exercise.reps && (
            <span className="font-medium">
              {exercise.sets} × {exercise.reps}
            </span>
          )}
          {exercise.rest_seconds && (
            <span className="text-muted-foreground">
              {exercise.rest_seconds} sec rest
            </span>
          )}
        </div>
        {exercise.notes && (
          <p className="text-sm text-muted-foreground mt-2">{exercise.notes}</p>
        )}
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
