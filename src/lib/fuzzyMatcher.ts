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

// Singleton instances
let exercisesCache: WgerExercise[] | null = null;
let fuseInstance: Fuse<WgerExercise> | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// OPTIMIZATION: In-memory cache for aliases with TTL
const aliasCache = new Map<string, { exercise: WgerExercise; confidence: number; timestamp: number }>();
const ALIAS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// OPTIMIZATION: Batch alias lookups
const pendingAliasLookups = new Map<string, Promise<WgerExercise | null>>();

// Load exercises from database and initialize Fuse
async function loadExercises(): Promise<void> {
  if (exercisesCache) {
    return;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  const startTime = performance.now();

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
      console.log(`[FuzzyMatcher] Loaded ${exercisesCache.length} exercises in ${(performance.now() - startTime).toFixed(0)}ms`);

      // OPTIMIZATION: Initialize Fuse with better scoring
      fuseInstance = new Fuse(exercisesCache, {
        keys: [
          { name: 'name', weight: 2 },
          { name: 'name_normalized', weight: 1.5 },
          { name: 'description', weight: 0.5 }
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 3,
        ignoreLocation: true,
        // OPTIMIZATION: Improve scoring
        distance: 100,
        useExtendedSearch: false,
      });
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function preloadExercises(): Promise<void> {
  await loadExercises();
}

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

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

// OPTIMIZATION: Batch fetch aliases from database
async function batchFetchAliases(normalizedNames: string[]): Promise<Map<string, WgerExercise>> {
  const uniqueNames = [...new Set(normalizedNames)];
  const now = Date.now();
  const results = new Map<string, WgerExercise>();
  const namesToFetch: string[] = [];

  // Check cache first
  for (const name of uniqueNames) {
    const cached = aliasCache.get(name);
    if (cached && (now - cached.timestamp) < ALIAS_CACHE_TTL) {
      results.set(name, cached.exercise);
    } else {
      namesToFetch.push(name);
    }
  }

  if (namesToFetch.length === 0) {
    return results;
  }

  // OPTIMIZATION: Single batched query instead of N queries
  const { data: aliases } = await supabase
    .from('exercise_aliases')
    .select('alias, confidence_score, exercises(*)')
    .in('alias', namesToFetch);

  if (aliases) {
    for (const alias of aliases) {
      if (alias.exercises) {
        const exercise = alias.exercises as unknown as WgerExercise;
        results.set(alias.alias, exercise);
        
        // Update cache
        aliasCache.set(alias.alias, {
          exercise,
          confidence: alias.confidence_score || 1.0,
          timestamp: now
        });
      }
    }
  }

  return results;
}

// OPTIMIZATION: Batch save aliases
async function batchSaveAliases(aliasData: Array<{ alias: string; exerciseId: string; confidence: number }>): Promise<void> {
  if (aliasData.length === 0) return;

  try {
    await supabase
      .from('exercise_aliases')
      .upsert(
        aliasData.map(({ alias, exerciseId, confidence }) => ({
          alias,
          exercise_id: exerciseId,
          confidence_score: confidence,
        })),
        { onConflict: 'alias' }
      );
  } catch (error) {
    console.error('Error batch saving aliases:', error);
  }
}

export async function findExerciseMatch(
  aiExerciseName: string
): Promise<ExerciseMatch | null> {
  if (!aiExerciseName) return null;

  await loadExercises();
  if (!exercisesCache || !fuseInstance) return null;

  const normalized = normalizeExerciseName(aiExerciseName);
  const aliasedName = COMMON_ALIASES[normalized];
  const searchName = aliasedName || aiExerciseName;
  const searchNormalized = aliasedName ? normalizeExerciseName(aliasedName) : normalized;

  // Check in-memory cache
  const now = Date.now();
  const cached = aliasCache.get(searchNormalized);
  if (cached && (now - cached.timestamp) < ALIAS_CACHE_TTL) {
    return {
      exercise: cached.exercise,
      confidence: cached.confidence,
      alternatives: [],
    };
  }

  // Check database alias (batched if called multiple times)
  const aliasMap = await batchFetchAliases([searchNormalized]);
  const aliasedExercise = aliasMap.get(searchNormalized);
  if (aliasedExercise) {
    return {
      exercise: aliasedExercise,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // Exact match
  const exactMatch = exercisesCache.find(
    (ex) => ex.name_normalized === searchNormalized
  );

  if (exactMatch) {
    await batchSaveAliases([{ alias: searchNormalized, exerciseId: exactMatch.id, confidence: 1.0 }]);
    return {
      exercise: exactMatch,
      confidence: 1.0,
      alternatives: [],
    };
  }

  // Fuzzy search
  let results = fuseInstance.search(searchName);

  if (results.length === 0 || (results[0].score || 1) > 0.4) {
    const withoutPrefix = removeEquipmentPrefix(searchName);
    if (withoutPrefix !== searchName.toLowerCase()) {
      const prefixResults = fuseInstance.search(withoutPrefix);
      if (prefixResults.length > 0 && (!results[0] || (prefixResults[0].score || 0) < (results[0].score || 1))) {
        results = prefixResults;
      }
    }
  }

  if (results.length === 0) {
    return null;
  }

  const matches = results.slice(0, 3).map((result) => ({
    exercise: result.item,
    confidence: 1 - (result.score || 0),
  }));

  const bestMatch = matches[0];

  if (bestMatch.confidence >= 0.8) {
    await batchSaveAliases([{ alias: searchNormalized, exerciseId: bestMatch.exercise.id, confidence: bestMatch.confidence }]);
  }

  return {
    exercise: bestMatch.exercise,
    confidence: bestMatch.confidence,
    alternatives: matches.slice(1),
  };
}

// OPTIMIZATION: Completely rewritten for parallel batching
export async function findExerciseMatches(
  exerciseNames: string[]
): Promise<Map<string, ExerciseMatch | null>> {
  const startTime = performance.now();
  console.log(`[FuzzyMatcher] Finding matches for ${exerciseNames.length} exercises...`);
  
  await loadExercises();
  if (!exercisesCache || !fuseInstance) {
    return new Map();
  }

  const results = new Map<string, ExerciseMatch | null>();
  const normalizedNames = exerciseNames.map(name => ({
    original: name,
    normalized: normalizeExerciseName(name),
    searchName: COMMON_ALIASES[normalizeExerciseName(name)] || name
  }));

  // OPTIMIZATION: Batch fetch all aliases at once
  const aliasMap = await batchFetchAliases(normalizedNames.map(n => n.normalized));
  
  // OPTIMIZATION: Process in parallel with proper batching
  const toFuzzyMatch: typeof normalizedNames = [];
  const aliasesToSave: Array<{ alias: string; exerciseId: string; confidence: number }> = [];

  for (const { original, normalized, searchName } of normalizedNames) {
    // Check alias cache
    const aliasedExercise = aliasMap.get(normalized);
    if (aliasedExercise) {
      results.set(original, {
        exercise: aliasedExercise,
        confidence: 1.0,
        alternatives: [],
      });
      continue;
    }

    // Check exact match
    const exactMatch = exercisesCache!.find(ex => ex.name_normalized === normalized);
    if (exactMatch) {
      results.set(original, {
        exercise: exactMatch,
        confidence: 1.0,
        alternatives: [],
      });
      aliasesToSave.push({ alias: normalized, exerciseId: exactMatch.id, confidence: 1.0 });
      continue;
    }

    // Queue for fuzzy matching
    toFuzzyMatch.push({ original, normalized, searchName });
  }

  // OPTIMIZATION: Fuzzy match remaining items
  for (const { original, normalized, searchName } of toFuzzyMatch) {
    let fuseResults = fuseInstance!.search(searchName);

    if (fuseResults.length === 0 || (fuseResults[0].score || 1) > 0.4) {
      const withoutPrefix = removeEquipmentPrefix(searchName);
      if (withoutPrefix !== searchName.toLowerCase()) {
        const prefixResults = fuseInstance!.search(withoutPrefix);
        if (prefixResults.length > 0 && (!fuseResults[0] || (prefixResults[0].score || 0) < (fuseResults[0].score || 1))) {
          fuseResults = prefixResults;
        }
      }
    }

    if (fuseResults.length === 0) {
      results.set(original, null);
      continue;
    }

    const matches = fuseResults.slice(0, 3).map(result => ({
      exercise: result.item,
      confidence: 1 - (result.score || 0),
    }));

    const bestMatch = matches[0];
    results.set(original, {
      exercise: bestMatch.exercise,
      confidence: bestMatch.confidence,
      alternatives: matches.slice(1),
    });

    if (bestMatch.confidence >= 0.8) {
      aliasesToSave.push({ alias: normalized, exerciseId: bestMatch.exercise.id, confidence: bestMatch.confidence });
    }
  }

  // OPTIMIZATION: Batch save all aliases at once
  if (aliasesToSave.length > 0) {
    await batchSaveAliases(aliasesToSave);
  }
  
  const duration = performance.now() - startTime;
  console.log(`[FuzzyMatcher] ✅ Matched ${exerciseNames.length} exercises in ${duration.toFixed(0)}ms`);
  
  return results;
}

export function clearExerciseCache(): void {
  exercisesCache = null;
  fuseInstance = null;
  aliasCache.clear();
}