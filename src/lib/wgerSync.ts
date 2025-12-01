import { supabase } from "@/integrations/supabase/client";

interface WgerExercise {
  id: number;
  name: string;
  description: string;
  category: {
    id: number;
    name: string;
  };
  muscles: Array<{
    id: number;
    name: string;
  }>;
  muscles_secondary: Array<{
    id: number;
    name: string;
  }>;
  equipment: Array<{
    id: number;
    name: string;
  }>;
  images: Array<{
    id: number;
    image: string;
    is_main: boolean;
  }>;
}

interface WgerResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WgerExercise[];
}

const WGER_API_BASE = "https://wger.de/api/v2";

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export async function syncWgerExercises(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let allExercises: WgerExercise[] = [];
    let url = `${WGER_API_BASE}/exercise/?language=2&limit=999`;

    // Fetch all pages of exercises
    while (url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WGER API error: ${response.statusText}`);
      }

      const data: WgerResponse = await response.json();
      allExercises = [...allExercises, ...data.results];
      url = data.next || '';
    }

    console.log(`Fetched ${allExercises.length} exercises from WGER API`);

    // Filter out exercises without valid names
    allExercises = allExercises.filter(exercise => exercise.name && exercise.name.trim());
    console.log(`Filtered to ${allExercises.length} exercises with valid names`);

    // Transform and upsert exercises
    const exercisesToInsert = allExercises.map(exercise => ({
      wger_id: exercise.id,
      name: exercise.name,
      name_normalized: normalizeExerciseName(exercise.name),
      description: exercise.description || null,
      category: exercise.category?.name || null,
      muscles: [
        ...exercise.muscles.map(m => m.name),
        ...exercise.muscles_secondary.map(m => m.name)
      ].filter((v, i, a) => a.indexOf(v) === i), // Unique muscles
      equipment: exercise.equipment.map(e => e.name),
      image_urls: exercise.images
        .filter(img => img.is_main)
        .map(img => img.image)
    }));

    // Upsert exercises in batches of 100
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < exercisesToInsert.length; i += batchSize) {
      const batch = exercisesToInsert.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('exercises')
        .upsert(batch, {
          onConflict: 'wger_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error upserting batch:', error);
        throw error;
      }

      successCount += batch.length;
      console.log(`Synced ${successCount}/${exercisesToInsert.length} exercises`);
    }

    return {
      success: true,
      count: successCount
    };

  } catch (error) {
    console.error('WGER sync error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
