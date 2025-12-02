import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModificationRequest {
  userId: string;
  workoutPlanId: string;
  modificationRequest: string; // User's request like "ease into it" or "work around my knee injury"
  userProfile: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, workoutPlanId, modificationRequest, userProfile }: ModificationRequest = await req.json();
    
    console.log('[modify-plan] User:', userId);
    console.log('[modify-plan] Plan ID:', workoutPlanId);
    console.log('[modify-plan] Request:', modificationRequest);

    // Fetch the current workout plan with all exercises
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .select(`
        *,
        workout_days(
          *,
          workout_exercises(*)
        )
      `)
      .eq('id', workoutPlanId)
      .eq('user_id', userId)
      .single();

    if (planError || !plan) {
      console.error('[modify-plan] Plan fetch error:', planError);
      throw new Error('Workout plan not found');
    }

    // Build the current plan structure for Claude
    const currentPlanDescription = plan.workout_days
      .sort((a: any, b: any) => a.day_order - b.day_order)
      .map((day: any) => {
        const exercises = day.workout_exercises
          .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
          .map((ex: any) => `  - ${ex.exercise_name}: ${ex.sets} sets x ${ex.reps} reps, ${ex.rest_seconds}s rest${ex.notes ? ` (${ex.notes})` : ''}`)
          .join('\n');
        return `${day.day_name}:\n${exercises}`;
      })
      .join('\n\n');

    // Build user context
    const userContext = userProfile ? `
User Profile:
- Goal: ${userProfile.fitness_goal || 'Not specified'}
- Experience: ${userProfile.experience_level || 'Not specified'}
- Equipment: ${userProfile.available_equipment?.join(', ') || 'Not specified'}
- Frequency: ${userProfile.workout_frequency || 'Not specified'} days/week
- Limitations: ${userProfile.limitations || 'None'}
` : '';

    // Ask Claude to generate modifications
    const prompt = `You are a fitness coach AI. The user wants to modify their existing workout plan.

${userContext}

CURRENT WORKOUT PLAN:
${currentPlanDescription}

USER'S MODIFICATION REQUEST: "${modificationRequest}"

Based on this request, generate a modified version of the workout plan. Consider:
- If they want to "ease into it", reduce intensity (fewer sets, lighter exercises, more rest)
- If they mention an injury, avoid exercises that could aggravate it and suggest alternatives
- If they want to "go harder", increase intensity appropriately for their experience level
- Keep the same day structure but modify exercises as needed

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "summary": "Brief description of changes made",
  "days": [
    {
      "day_id": "existing-day-uuid",
      "day_name": "Day 1 - Upper Body",
      "exercises": [
        {
          "exercise_id": "existing-exercise-uuid-or-null-for-new",
          "exercise_name": "Exercise Name",
          "sets": 3,
          "reps": "10-12",
          "rest_seconds": 60,
          "notes": "Optional notes"
        }
      ]
    }
  ]
}

Use the actual day IDs from the current plan. For exercises, use existing IDs if keeping the exercise, or null for new exercises.

Current day IDs:
${plan.workout_days.map((d: any) => `- ${d.day_name}: ${d.id}`).join('\n')}

Current exercise IDs per day:
${plan.workout_days.map((d: any) => 
  `${d.day_name}:\n${d.workout_exercises.map((e: any) => `  - ${e.exercise_name}: ${e.id}`).join('\n')}`
).join('\n')}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[modify-plan] Claude API error:', errorText);
      throw new Error('Failed to get AI response');
    }

    const claudeResponse = await response.json();
    const responseText = claudeResponse.content[0].text;
    
    console.log('[modify-plan] Claude response:', responseText.substring(0, 200));

    // Parse the JSON response
    let modifications;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      modifications = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[modify-plan] JSON parse error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Apply the modifications to the database
    for (const day of modifications.days) {
      // Delete existing exercises for this day
      const { error: deleteError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_day_id', day.day_id);

      if (deleteError) {
        console.error('[modify-plan] Delete error:', deleteError);
      }

      // Insert new/modified exercises
      const exercisesToInsert = day.exercises.map((ex: any, index: number) => ({
        workout_day_id: day.day_id,
        exercise_name: ex.exercise_name,
        exercise_order: index + 1,
        sets: ex.sets,
        reps: String(ex.reps),
        rest_seconds: ex.rest_seconds,
        notes: ex.notes || null,
        exercise_id: null, // We're using exercise_name, not linking to exercises table
      }));

      const { error: insertError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert);

      if (insertError) {
        console.error('[modify-plan] Insert error:', insertError);
        throw insertError;
      }
    }

    // Update the plan's updated_at timestamp
    await supabase
      .from('workout_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', workoutPlanId);

    // Mark that user has used their free modification
    await supabase
      .from('user_fitness_profiles')
      .update({ has_used_free_modification: true })
      .eq('user_id', userId);

    console.log('[modify-plan] Modifications applied successfully');

    return new Response(
      JSON.stringify({
        success: true,
        summary: modifications.summary,
        message: 'Your workout plan has been updated!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[modify-plan] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

