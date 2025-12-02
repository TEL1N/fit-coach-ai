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
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// Load exercises from database and initialize Fuse
async function loadExercises(): Promise<void> {
  if (exercisesCache) {
    console.log('[FuzzyMatcher] Using cached exercises:', exercisesCache.length);
    return;
  }

  // If already loading, wait for existing load to complete
  if (isLoading && loadPromise) {
    console.log('[FuzzyMatcher] Load already in progress, waiting...');
    return loadPromise;
  }

  isLoading = true;
  const startTime = performance.now();
  console.log('[FuzzyMatcher] Starting exercise load...');

  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*');

      if (error) {
        console.error('Error loading exercises:', error);
        throw error;
      }

      exercisesCache = data || [];
      const loadTime = performance.now() - startTime;
      console.log(`[FuzzyMatcher] Loaded ${exercisesCache.length} exercises in ${loadTime.toFixed(0)}ms`);

      // Initialize Fuse.js with fuzzy search configuration
      const fuseStartTime = performance.now();
      fuseInstance = new Fuse(exercisesCache, {
        keys: [
          { name: 'name', weight: 2 },
          { name: 'name_normalized', weight: 1.5 },
          { name: 'description', weight: 0.5 } // Add description for fallback matching
        ],
        threshold: 0.4, // 0 = exact match, 1 = match anything
        includeScore: true,
        minMatchCharLength: 3,
        ignoreLocation: true, // Search entire description text
      });
      const fuseTime = performance.now() - fuseStartTime;
      console.log(`[FuzzyMatcher] Initialized Fuse.js in ${fuseTime.toFixed(0)}ms`);
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

// Pre-load exercises on app startup
export async function preloadExercises(): Promise<void> {
  console.log('[FuzzyMatcher] Preload requested');
  await loadExercises();
}

// Common aliases for better matching
const COMMON_ALIASES: Record<string, string> = {
  'romanian deadlift': 'stiff leg deadlift',
  'rdl': 'romanian deadlift',
  'cable fly': 'cable crossover',
  'cable flyes': 'cable crossover',
  'face pull': 'rear delt',
  'pull up': 'pullup',
  'chin up': 'chinup',
  'sit up': 'situp',
  'push up': 'pushup',
  'leg curl': 'lying leg curl',
  'leg extension': 'leg extensions',
};

// Normalize exercise name for matching
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars including hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Remove common equipment prefixes for better fuzzy matching
function removeEquipmentPrefix(name: string): string {
  const prefixes = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'smith machine'];
  let normalized = name.toLowerCase();
  
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix + ' ')) {
      normalized = normalized.substring(prefix.length + 1);
      break;
    }
  }
  
  return normalized.trim();
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

  // 0. Check common aliases first
  const aliasedName = COMMON_ALIASES[normalized];
  const searchName = aliasedName || aiExerciseName;
  const searchNormalized = aliasedName ? normalizeExerciseName(aliasedName) : normalized;

  // 1. Check for existing alias
  const { data: alias } = await supabase
    .from('exercise_aliases')
    .select('exercise_id, confidence_score, exercises(*)')
    .eq('alias', searchNormalized)
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
    (ex) => ex.name_normalized === searchNormalized
  );

  if (exactMatch) {
    // Save as alias for future lookups
    await saveAlias(searchNormalized, exactMatch.id, 1.0);
    return {
      exercise: exactMatch,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // 3. Fuzzy search with Fuse.js - try with original name first
  let results = fuseInstance.search(searchName);

  // 4. If no good results, try without equipment prefix
  if (results.length === 0 || (results[0].score || 1) > 0.4) {
    const withoutPrefix = removeEquipmentPrefix(searchName);
    if (withoutPrefix !== searchName.toLowerCase()) {
      const prefixResults = fuseInstance.search(withoutPrefix);
      if (prefixResults.length > 0 && (!results[0] || (prefixResults[0].score || 0) < (results[0].score || 1))) {
        results = prefixResults;
      }
    }
  }

  // 5. If still low confidence, try searching descriptions with broader threshold
  if (results.length === 0 || (results[0].score || 1) > 0.5) {
    const descriptionSearch = new Fuse(exercisesCache, {
      keys: ['description'],
      threshold: 0.6, // More lenient for description matching
      includeScore: true,
      ignoreLocation: true,
    });
    
    const descResults = descriptionSearch.search(searchName);
    if (descResults.length > 0 && (!results[0] || (descResults[0].score || 0) < (results[0].score || 1))) {
      results = descResults;
      console.log(`Matched "${searchName}" via description: ${descResults[0].item.name}`);
    }
  }

  if (results.length === 0) {
    console.warn('No match found for:', aiExerciseName);
    return null;
  }

  // Convert Fuse scores to confidence (Fuse score is 0-1, where 0 is best)
  const matches = results.slice(0, 3).map((result) => ({
    exercise: result.item,
    confidence: 1 - (result.score || 0),
  }));

  const bestMatch = matches[0];

  // Log low confidence matches for improvement
  if (bestMatch.confidence < 0.8) {
    console.warn(`Low confidence match for "${aiExerciseName}": ${bestMatch.exercise.name} (${(bestMatch.confidence * 100).toFixed(0)}%)`);
  }

  // Only save alias if confidence is high enough
  if (bestMatch.confidence >= 0.8) {
    await saveAlias(searchNormalized, bestMatch.exercise.id, bestMatch.confidence);
  }

  return {
    exercise: bestMatch.exercise,
    confidence: bestMatch.confidence,
    alternatives: matches.slice(1),
  };
}

// Batch find exercise matches for multiple exercises (optimized)
export async function findExerciseMatches(
  exerciseNames: string[]
): Promise<Map<string, ExerciseMatch | null>> {
  const startTime = performance.now();
  console.log(`[FuzzyMatcher] Finding matches for ${exerciseNames.length} exercises...`);
  
  const results = new Map<string, ExerciseMatch | null>();
  
  // Run all matches in parallel
  const matches = await Promise.all(
    exerciseNames.map(name => findExerciseMatch(name))
  );
  
  exerciseNames.forEach((name, index) => {
    results.set(name, matches[index]);
  });
  
  const duration = performance.now() - startTime;
  console.log(`[FuzzyMatcher] Matched ${exerciseNames.length} exercises in ${duration.toFixed(0)}ms`);
  
  return results;
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
