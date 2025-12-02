import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// VALUE MAPPERS - Convert database keys to human-readable descriptions
// These MUST match the values stored during onboarding
// ============================================================================

const GOAL_MAP: Record<string, string> = {
  build_muscle: "BUILD MUSCLE → Hypertrophy focus: 8-12 reps, 60-90s rest, controlled tempo, isolate each muscle group",
  lose_weight: "LOSE WEIGHT → Fat burning focus: 12-15 reps, 30-45s rest, compound movements, keep heart rate elevated",
  general_fitness: "GENERAL FITNESS → Balanced approach: mix of strength and cardio, 8-12 reps, moderate rest",
  increase_strength: "INCREASE STRENGTH → Strength focus: 3-6 reps, 2-3 min rest, heavy compound lifts (squat, deadlift, bench, press)",
  improve_endurance: "IMPROVE ENDURANCE → Cardio/HIIT focus: Use circuit training, minimal rest (15-30s), include cardio exercises like burpees, jumping jacks, high knees, mountain climbers, jump squats, box jumps. Can use time-based format (e.g. '30 seconds' instead of reps). High rep ranges (15-20+) for any strength exercises.",
};

const EXPERIENCE_MAP: Record<string, string> = {
  complete_beginner: "Complete Beginner - needs simple exercises, machines OK, clear form cues",
  returning: "Returning After Break - has experience but rebuilding, start moderate",
  occasional: "Occasional Exerciser - knows basics but inconsistent",
  regular: "Regular Gym-Goer - comfortable with most exercises, can handle free weights",
  experienced: "Experienced Lifter - years of training, can handle advanced programming",
  advanced: "Advanced Athlete - competitive level, sophisticated periodization OK",
};

const EQUIPMENT_MAP: Record<string, string> = {
  full_gym: "Full Commercial Gym (all machines, cables, free weights available)",
  barbell: "Barbell + Weight Plates",
  dumbbells: "Dumbbells",
  squat_rack: "Squat Rack / Power Rack",
  bench: "Adjustable Bench",
  pullup_bar: "Pull-up Bar",
  cable_machine: "Cable Machine",
  kettlebells: "Kettlebells",
  resistance_bands: "Resistance Bands",
  bodyweight: "Bodyweight Only (NO equipment - use push ups, pull ups, squats, lunges, etc.)",
};

interface UserProfile {
  fitness_goal?: string | null;
  experience_level?: string | null;
  available_equipment?: string[] | null;
  workout_frequency?: number | null;
  limitations?: string | null;
}

/**
 * Formats the user profile with human-readable values for Claude
 */
function formatUserProfile(profile: UserProfile): string {
  const goal = profile.fitness_goal 
    ? (GOAL_MAP[profile.fitness_goal] || profile.fitness_goal)
    : "Not specified";
  
  const experience = profile.experience_level
    ? (EXPERIENCE_MAP[profile.experience_level] || profile.experience_level)
    : "Not specified";
  
  let equipment = "Not specified";
  if (profile.available_equipment && profile.available_equipment.length > 0) {
    const mappedEquipment = profile.available_equipment.map(eq => 
      EQUIPMENT_MAP[eq] || eq
    );
    equipment = mappedEquipment.join(", ");
  }
  
  let frequency = "Not specified";
  if (profile.workout_frequency) {
    frequency = `${profile.workout_frequency} days per week`;
  }
  
  const limitations = profile.limitations?.trim() || "None reported";

  return `
══════════════════════════════════════════════════════════════════════════════
                    USER FITNESS PROFILE - MANDATORY REQUIREMENTS
══════════════════════════════════════════════════════════════════════════════

PRIMARY GOAL: ${goal}

EXPERIENCE LEVEL: ${experience}

AVAILABLE EQUIPMENT: ${equipment}

TRAINING FREQUENCY: ${frequency}

INJURIES/LIMITATIONS: ${limitations}

══════════════════════════════════════════════════════════════════════════════
                         STRICT REQUIREMENTS
══════════════════════════════════════════════════════════════════════════════

1. MUST create EXACTLY ${profile.workout_frequency || 3} workout days

2. MUST match the user's GOAL with appropriate rep ranges and rest periods

3. MUST ONLY use exercises possible with the AVAILABLE EQUIPMENT above
   - If "Bodyweight Only" → NO barbells, dumbbells, cables, or machines
   - If specific items listed → ONLY use those items

4. MUST match complexity to EXPERIENCE LEVEL
   - Beginners → simple movements, clear instructions
   - Advanced → can use complex movements

5. MUST AVOID exercises that stress any reported LIMITATIONS
`;
}

function getFitnessCoachSystemPrompt(userProfile?: UserProfile | null): string {
  const basePrompt = `You are TailorFit AI, a certified fitness coach. Generate a personalized workout plan.

OUTPUT FORMAT - CRITICAL:
- Output ONLY valid JSON, nothing else
- Start with { and end with }
- NO text before or after the JSON
- NO markdown code blocks

JSON STRUCTURE:
{
  "workout_name": "Program name reflecting the goal",
  "description": "2-3 sentence overview",
  "days": [
    {
      "day_name": "Day 1 - Focus (e.g., Upper Body)",
      "day_order": 1,
      "exercises": [
        {
          "name": "full exercise name with equipment type",
          "exercise_order": 1,
          "sets": 3,
          "reps": "8-10",
          "rest_seconds": 90,
          "notes": "Form cues"
        }
      ]
    }
  ]
}

EXERCISE NAMING - BE SPECIFIC:
- "barbell bench press" NOT "bench press"
- "dumbbell shoulder press" NOT "shoulder press"
- "bodyweight squat" NOT "squat"
- "pull up" or "chin up" (specify which)

EXERCISE COUNT: 4-6 exercises per day

EXERCISE EXAMPLES BY EQUIPMENT:

Bodyweight Only:
- push up, diamond push up, pike push up
- pull up, chin up (if bar available)
- bodyweight squat, jump squat, pistol squat
- walking lunge, reverse lunge, split squat
- plank, mountain climber, burpee
- glute bridge, single leg glute bridge
- dip (if parallel bars available)

Dumbbells:
- dumbbell bench press, dumbbell floor press
- dumbbell row, dumbbell shoulder press
- dumbbell bicep curl, dumbbell tricep extension
- goblet squat, dumbbell lunges
- dumbbell romanian deadlift

Barbell:
- barbell bench press, barbell row
- barbell squat, barbell deadlift
- overhead press, barbell curl

Full Gym (can use any):
- All of the above plus machines and cables
- lat pulldown, seated cable row
- leg press, leg curl, leg extension
- cable fly, cable crossover

CARDIO & ENDURANCE EXERCISES (use for "Improve Endurance" goal):
- burpees, jumping jacks, high knees, butt kicks
- mountain climbers, jump squats, box jumps
- skater jumps, tuck jumps, star jumps
- running in place, sprint intervals
- jump rope, speed step ups
- battle ropes, rowing machine, assault bike
- bear crawl, crab walk, inch worm
FORMAT FOR ENDURANCE: Use circuits (3-4 exercises back-to-back), time-based (e.g. "30 seconds"), or high reps (20+) with minimal rest (15-30s between exercises)`;

  if (userProfile) {
    return basePrompt + formatUserProfile(userProfile);
  }

  return basePrompt + `

NOTE: No user profile available. Create a general 3-day full body program for beginners using basic gym equipment.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('[generate-workout-plan] ANTHROPIC_API_KEY is not set');
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, userId } = await req.json();
    console.log('[generate-workout-plan] Starting for user:', userId);

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_fitness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.warn('[generate-workout-plan] No profile found:', profileError.message);
    } else {
      console.log('[generate-workout-plan] Profile loaded:', {
        goal: userProfile.fitness_goal,
        experience: userProfile.experience_level,
        equipment: userProfile.available_equipment,
        frequency: userProfile.workout_frequency,
        limitations: userProfile.limitations
      });
    }

    // Build system prompt with profile
    const systemPrompt = getFitnessCoachSystemPrompt(userProfile);
    console.log('[generate-workout-plan] System prompt length:', systemPrompt.length);

    // Simple request message
    const conversationHistory = [{
      role: 'user',
      content: 'Generate my personalized workout plan based on my profile. Output only the JSON.'
    }];

    // Call Claude API
    console.log('[generate-workout-plan] Calling Claude API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-workout-plan] Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;
    console.log('[generate-workout-plan] Response received, length:', aiResponse.length);

    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[generate-workout-plan] No JSON found. Response:', aiResponse.substring(0, 500));
      throw new Error('No valid JSON found in AI response');
    }

    const workoutPlan = JSON.parse(jsonMatch[0]);
    console.log('[generate-workout-plan] Parsed plan:', workoutPlan.workout_name);
    console.log('[generate-workout-plan] Days count:', workoutPlan.days?.length);

    // Deactivate existing active plans for this user
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Save workout plan to database
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

    if (planError) {
      console.error('[generate-workout-plan] Error inserting plan:', planError);
      throw planError;
    }

    console.log('[generate-workout-plan] Created plan:', plan.id);

    // Save workout days and exercises
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

      if (dayError) {
        console.error('[generate-workout-plan] Error inserting day:', dayError);
        throw dayError;
      }

      console.log('[generate-workout-plan] Created day:', workoutDay.day_name);

      // Save exercises for this day
      for (let i = 0; i < day.exercises.length; i++) {
        const exercise = day.exercises[i];
        const { error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert({
            workout_day_id: workoutDay.id,
            exercise_id: null,
            exercise_name: exercise.name,
            exercise_order: exercise.exercise_order || i + 1,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
            notes: exercise.notes || null
          });
        
        if (exerciseError) {
          console.error('[generate-workout-plan] Error inserting exercise:', exerciseError);
          throw exerciseError;
        }
      }
    }

    // Link conversation to workout plan
    if (conversationId) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ workout_plan_id: plan.id })
        .eq('id', conversationId);

      if (updateError) {
        console.error('[generate-workout-plan] Error updating conversation:', updateError);
        throw updateError;
      }

      // Save summary message
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: `Your ${workoutPlan.workout_name} is ready! 💪 Check it out in the Workouts tab.`
        });
    }

    const duration = Date.now() - startTime;
    console.log(`[generate-workout-plan] Complete in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        workoutPlanId: plan.id,
        workoutName: workoutPlan.workout_name,
        daysCount: workoutPlan.days?.length
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[generate-workout-plan] Failed after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});