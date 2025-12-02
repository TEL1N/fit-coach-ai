import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Value mappers
const EXPERIENCE_MAP: Record<string, string> = {
  complete_beginner: "Complete Beginner",
  returning: "Returning After Break",
  occasional: "Occasional Exerciser",
  regular: "Regular Gym-Goer",
  experienced: "Experienced Lifter",
  advanced: "Advanced Athlete",
};

const EQUIPMENT_MAP: Record<string, string> = {
  full_gym: "Full Gym",
  barbell: "Barbell",
  dumbbells: "Dumbbells",
  squat_rack: "Squat Rack",
  bench: "Bench",
  pullup_bar: "Pull-up Bar",
  cable_machine: "Cable Machine",
  kettlebells: "Kettlebells",
  resistance_bands: "Resistance Bands",
  bodyweight: "Bodyweight Only",
};

interface UserProfile {
  fitness_goal?: string | null;
  experience_level?: string | null;
  available_equipment?: string[] | null;
  workout_frequency?: number | null;
  limitations?: string | null;
}

function buildPromptForGoal(profile: UserProfile): string {
  const goal = profile.fitness_goal || "general_fitness";
  const experience = EXPERIENCE_MAP[profile.experience_level || "complete_beginner"] || "Beginner";
  const frequency = profile.workout_frequency || 3;
  const limitations = profile.limitations?.trim() || "None";
  
  let equipment = "Bodyweight Only";
  if (profile.available_equipment && profile.available_equipment.length > 0) {
    equipment = profile.available_equipment.map(eq => EQUIPMENT_MAP[eq] || eq).join(", ");
  }

  // GOAL-SPECIFIC PROMPTS - completely different prompts per goal
  if (goal === "improve_endurance") {
    return `Create a ${frequency}-day CARDIO/HIIT workout plan.

USER: ${experience}, Equipment: ${equipment}, Limitations: ${limitations}

THIS IS AN ENDURANCE/CARDIO PLAN. REQUIREMENTS:
- Use ANY cardio/HIIT exercises appropriate for the user's equipment and limitations
- Examples: burpees, jumping jacks, high knees, mountain climbers, jump squats, skater jumps, tuck jumps, bear crawls, running, cycling, rowing, battle ropes, etc.
- You can create custom exercises that fit the user's goals and equipment
- Reps MUST be time-based: "30 seconds" or "45 seconds" (NOT "10 reps")
- Rest MUST be short: 15-30 seconds (NOT 60 seconds)
- Day names should include "HIIT" or "Cardio"
- Focus on exercises that elevate heart rate and improve cardiovascular endurance

IMPORTANT: You are NOT restricted to any specific exercise database. Use any exercises that are appropriate for the user's goals, equipment, and limitations.

Return ONLY this JSON structure:
{
  "workout_name": "HIIT Cardio Program",
  "description": "High-intensity cardio for endurance",
  "days": [
    {
      "day_name": "Day 1 - HIIT Circuit",
      "day_order": 1,
      "exercises": [
        {"name": "jumping jacks", "exercise_order": 1, "sets": 3, "reps": "30 seconds", "rest_seconds": 20, "notes": "Fast pace"}
      ]
    }
  ]
}`;
  }

  if (goal === "increase_strength") {
    return `Create a ${frequency}-day STRENGTH workout plan.

USER: ${experience}, Equipment: ${equipment}, Limitations: ${limitations}

THIS IS A STRENGTH PLAN. REQUIREMENTS:
- Use ANY strength exercises appropriate for the user's equipment and limitations
- Examples: squats, deadlifts, bench press, overhead press, rows, pull-ups, dips, leg press, etc.
- You can create custom exercises that fit the user's goals and equipment
- Reps: 3-6 reps (low reps, heavy weight)
- Rest: 120-180 seconds (long rest for strength)
- Focus on compound movements that build maximal strength

IMPORTANT: You are NOT restricted to any specific exercise database. Use any exercises that are appropriate for the user's goals, equipment, and limitations.

Return ONLY this JSON structure:
{
  "workout_name": "Strength Program",
  "description": "Build maximal strength",
  "days": [
    {
      "day_name": "Day 1 - Lower Body Strength",
      "day_order": 1,
      "exercises": [
        {"name": "barbell squat", "exercise_order": 1, "sets": 5, "reps": "5", "rest_seconds": 180, "notes": "Heavy weight, full depth"}
      ]
    }
  ]
}`;
  }

  if (goal === "build_muscle") {
    return `Create a ${frequency}-day HYPERTROPHY (muscle building) workout plan.

USER: ${experience}, Equipment: ${equipment}, Limitations: ${limitations}

THIS IS A MUSCLE BUILDING PLAN. REQUIREMENTS:
- Use ANY exercises appropriate for the user's equipment and limitations
- Include both compound and isolation exercises for each muscle group
- Examples: bench press, bicep curls, tricep extensions, lateral raises, leg curls, calf raises, etc.
- You can create custom exercises that fit the user's goals and equipment
- Reps: 8-12 reps per set
- Rest: 60-90 seconds
- Focus on exercises that target specific muscle groups for hypertrophy

IMPORTANT: You are NOT restricted to any specific exercise database. Use any exercises that are appropriate for the user's goals, equipment, and limitations.

Return ONLY this JSON structure:
{
  "workout_name": "Hypertrophy Program",
  "description": "Build muscle size",
  "days": [
    {
      "day_name": "Day 1 - Push",
      "day_order": 1,
      "exercises": [
        {"name": "barbell bench press", "exercise_order": 1, "sets": 4, "reps": "8-12", "rest_seconds": 90, "notes": "Control the weight"}
      ]
    }
  ]
}`;
  }

  if (goal === "lose_weight") {
    return `Create a ${frequency}-day FAT LOSS workout plan.

USER: ${experience}, Equipment: ${equipment}, Limitations: ${limitations}

THIS IS A FAT LOSS PLAN. REQUIREMENTS:
- Use ANY exercises appropriate for the user's equipment and limitations
- Mix compound movements with cardio exercises
- Examples: squats, lunges, burpees, jumping jacks, mountain climbers, kettlebell swings, battle ropes, etc.
- You can create custom exercises that fit the user's goals and equipment
- Reps: 12-15 reps
- Rest: 30-45 seconds (short rest keeps heart rate up)
- Focus on exercises that burn maximum calories

IMPORTANT: You are NOT restricted to any specific exercise database. Use any exercises that are appropriate for the user's goals, equipment, and limitations.

Return ONLY this JSON structure:
{
  "workout_name": "Fat Loss Program",
  "description": "Burn calories and lose fat",
  "days": [
    {
      "day_name": "Day 1 - Full Body Burn",
      "day_order": 1,
      "exercises": [
        {"name": "goblet squat", "exercise_order": 1, "sets": 3, "reps": "15", "rest_seconds": 30, "notes": "Keep moving"}
      ]
    }
  ]
}`;
  }

  // Default: general fitness
  return `Create a ${frequency}-day GENERAL FITNESS workout plan.

USER: ${experience}, Equipment: ${equipment}, Limitations: ${limitations}

GENERAL FITNESS PLAN:
- Use ANY exercises appropriate for the user's equipment and limitations
- Mix of strength and cardio exercises
- Examples: squats, push-ups, planks, lunges, jumping jacks, running, cycling, etc.
- You can create custom exercises that fit the user's goals and equipment
- Reps: 8-12 for strength exercises
- Rest: 45-60 seconds
- Focus on balanced, well-rounded fitness

IMPORTANT: You are NOT restricted to any specific exercise database. Use any exercises that are appropriate for the user's goals, equipment, and limitations.

Return ONLY this JSON structure:
{
  "workout_name": "General Fitness Program",
  "description": "Balanced fitness",
  "days": [
    {
      "day_name": "Day 1 - Full Body",
      "day_order": 1,
      "exercises": [
        {"name": "bodyweight squat", "exercise_order": 1, "sets": 3, "reps": "12", "rest_seconds": 60, "notes": "Full range of motion"}
      ]
    }
  ]
}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, userId } = await req.json();
    console.log('[workout] User:', userId);

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_fitness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.warn('[workout] No profile:', profileError.message);
    }

    console.log('[workout] Goal:', userProfile?.fitness_goal);
    console.log('[workout] Equipment:', userProfile?.available_equipment);

    // Build goal-specific prompt
    const prompt = buildPromptForGoal(userProfile || {});
    console.log('[workout] Prompt:', prompt.substring(0, 100) + '...');

    // Call Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[workout] API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;
    console.log('[workout] Response:', aiResponse.substring(0, 200) + '...');

    // Parse JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[workout] No JSON:', aiResponse);
      throw new Error('No valid JSON in response');
    }

    const workoutPlan = JSON.parse(jsonMatch[0]);
    console.log('[workout] Plan:', workoutPlan.workout_name);

    // Deactivate old plans
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Save new plan
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        name: workoutPlan.workout_name,
        description: workoutPlan.description || null,
        weeks_duration: 1,
        is_active: true
      })
      .select()
      .single();

    if (planError) throw planError;

    // Save days first (need IDs for exercises)
    const workoutDays = [];
    for (const day of workoutPlan.days) {
      const { data: workoutDay, error: dayError } = await supabase
        .from('workout_days')
        .insert({
          workout_plan_id: plan.id,
          day_name: day.day_name,
          day_order: day.day_order,
          week_number: 1
        })
        .select()
        .single();

      if (dayError) throw dayError;
      workoutDays.push({ day, workoutDay });
    }

    // Batch insert all exercises at once (much faster than sequential)
    const allExercises = [];
    for (const { day, workoutDay } of workoutDays) {
      for (let i = 0; i < day.exercises.length; i++) {
        const exercise = day.exercises[i];
        allExercises.push({
          workout_day_id: workoutDay.id,
          exercise_id: null,
          exercise_name: exercise.name,
          exercise_order: exercise.exercise_order || i + 1,
          sets: exercise.sets,
          reps: String(exercise.reps),
          rest_seconds: exercise.rest_seconds,
          notes: exercise.notes || null
        });
      }
    }

    // Single batch insert for all exercises
    if (allExercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(allExercises);

      if (exercisesError) throw exercisesError;
    }

    // Link conversation
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ workout_plan_id: plan.id })
        .eq('id', conversationId);

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: `Your ${workoutPlan.workout_name} is ready! 💪 Check it out in the Workouts tab.`
        });
    }

    console.log(`[workout] Done in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        workoutPlanId: plan.id,
        workoutName: workoutPlan.workout_name,
        daysCount: workoutPlan.days?.length
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[workout] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', success: false }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});