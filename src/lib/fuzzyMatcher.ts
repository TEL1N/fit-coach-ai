import Fuse from 'fuse.js';
import { supabase } from "@/integrations/supabase/client";

interface WgerExercise {
  id: string;
  wger_id: number;
  name: string;
  name_normalized: string;
  description: string | null;
  category: string | null;
  muscles: string[] | null;
  equipment: string[] | null;
  image_urls: string[] | null;
}

interface ExerciseMatch {
  exercise: WgerExercise;
  confidence: number;
  alternatives: Array<{ exercise: WgerExercise; confidence: number }>;
}

let exercisesCache: WgerExercise[] | null = null;
let fuseInstance: Fuse<WgerExercise> | null = null;

// Load exercises from database and initialize Fuse
async function loadExercises(): Promise<void> {
  if (exercisesCache) return;

  const { data, error } = await supabase
    .from('exercises')
    .select('*');

  if (error) {
    console.error('Error loading exercises:', error);
    throw error;
  }

  exercisesCache = data || [];

  // Initialize Fuse.js with fuzzy search configuration
  fuseInstance = new Fuse(exercisesCache, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'name_normalized', weight: 1.5 }
    ],
    threshold: 0.4, // 0 = exact match, 1 = match anything
    includeScore: true,
    minMatchCharLength: 3,
  });
}

// Normalize exercise name for matching
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Find exact match first, then check aliases, then fuzzy search
export async function findExerciseMatch(
  aiExerciseName: string
): Promise<ExerciseMatch | null> {
  if (!aiExerciseName) return null;

  // Ensure exercises are loaded
  await loadExercises();
  if (!exercisesCache || !fuseInstance) return null;

  const normalized = normalizeExerciseName(aiExerciseName);

  // 1. Check for existing alias
  const { data: alias } = await supabase
    .from('exercise_aliases')
    .select('exercise_id, confidence_score, exercises(*)')
    .eq('alias', normalized)
    .maybeSingle();

  if (alias && alias.exercises) {
    const exercise = alias.exercises as unknown as WgerExercise;
    return {
      exercise,
      confidence: alias.confidence_score || 1.0,
      alternatives: [],
    };
  }

  // 2. Try exact match on name_normalized
  const exactMatch = exercisesCache.find(
    (ex) => ex.name_normalized === normalized
  );

  if (exactMatch) {
    // Save as alias for future lookups
    await saveAlias(normalized, exactMatch.id, 1.0);
    return {
      exercise: exactMatch,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // 3. Fuzzy search with Fuse.js
  const results = fuseInstance.search(aiExerciseName);

  if (results.length === 0) return null;

  // Convert Fuse scores to confidence (Fuse score is 0-1, where 0 is best)
  const matches = results.slice(0, 3).map((result) => ({
    exercise: result.item,
    confidence: 1 - (result.score || 0),
  }));

  const bestMatch = matches[0];

  // Only save alias if confidence is high enough
  if (bestMatch.confidence >= 0.8) {
    await saveAlias(normalized, bestMatch.exercise.id, bestMatch.confidence);
  }

  return {
    exercise: bestMatch.exercise,
    confidence: bestMatch.confidence,
    alternatives: matches.slice(1),
  };
}

// Save exercise alias for faster future lookups
async function saveAlias(
  alias: string,
  exerciseId: string,
  confidence: number
): Promise<void> {
  try {
    await supabase
      .from('exercise_aliases')
      .upsert(
        {
          alias,
          exercise_id: exerciseId,
          confidence_score: confidence,
        },
        {
          onConflict: 'alias',
        }
      );
  } catch (error) {
    console.error('Error saving alias:', error);
  }
}

// Clear cache (useful for testing or after syncing new exercises)
export function clearExerciseCache(): void {
  exercisesCache = null;
  fuseInstance = null;
}
