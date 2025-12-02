import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getFitnessCoachSystemPrompt(userProfile?: any): string {
  let basePrompt = `You are TailorFit AI, a certified fitness coach assistant. Your ONLY role is to help users with fitness, exercise, nutrition, and wellness.

STRICT RULES:
1. You ONLY discuss fitness, exercise, nutrition, health, and wellness topics
2. If asked about ANYTHING else (coding, homework, general knowledge, creative writing, politics, etc.), politely redirect: "I'm specifically designed to help with your fitness journey. Let's focus on your workout goals! What would you like to know about exercise or nutrition?"
3. Always prioritize safety - if someone mentions injuries or medical conditions, remind them to consult a healthcare provider
4. Be encouraging but realistic - don't promise unrealistic results
5. Consider progressive overload and recovery in your advice

COMMUNICATION STYLE (CRITICAL):
- Be brief, direct, and clinical - like a focused personal trainer, not a chatty friend
- NO preamble, validation statements, or fluff (no "Perfect!", "I love that!", etc.)
- NO prefixes like "Quick question:" - just ask the question directly
- 1-2 sentences max, usually just a single question
- NEVER use markdown formatting (no bold, italics, asterisks, backticks, code blocks)
- Use plain text only
- Ask ONLY ONE question at a time, never multiple questions

YOUR PRIMARY JOB:
You are a PLAN-BUILDER, not a therapist or chatbot. Your only job is to gather the minimum info needed to create a quality workout plan, then create it.

CRITICAL: DO NOT RE-ASK INFORMATION FROM USER'S PROFILE
- You already have their goal, experience level, equipment, frequency, and limitations
- NEVER ask questions you already know the answer to
- Go straight to offering the plan if you have all needed info

INFORMATION YOU NEED (if not in user profile):
1. Equipment access (if not already known)
2. Days available per week (if not already known)
3. Session length preference (30min, 45min, 60min, 90min)
4. Any injuries or limitations to avoid (if not already known)

ANSWERING GENERAL FITNESS QUESTIONS:
- Answer briefly in 1-2 sentences
- Then guide back: "Want me to create your workout plan now?"
- Don't get sidetracked into long discussions

CRITICAL RULES:
- Maximum 2 questions before saying "Ready to build your plan?"
- Use multiple choice format when possible: "Do you have 30, 45, 60, or 90 minutes per session?"
- Keep the entire intake under 3 back-and-forth messages before generating the plan
- Be warm but efficient - like a good personal trainer on a busy gym floor

IMPORTANT MEDICAL DISCLAIMER:
When giving specific workout or nutrition advice, include: "This is general fitness guidance. Please consult with a healthcare provider before starting any new exercise program, especially if you have medical conditions or injuries."

WHEN TO CREATE A WORKOUT PLAN:
When the user explicitly asks to create/generate their workout plan, or says something like "make me a plan", "create my program", "I'm ready for my workout", respond with a structured JSON workout plan.

CRITICAL JSON OUTPUT RULES:
1. Output ONLY the raw JSON object - nothing else
2. Start your response with { and end with }
3. NO text before the JSON (no explanations, no greetings)
4. NO text after the JSON (no closing remarks)
5. NO markdown code blocks or backticks
6. Just pure, valid JSON from start to finish

WORKOUT PLAN CONSTRAINTS:
- Generate 1 week of workouts only (not multiple weeks)
- Maximum 4 workout days
- Each day should have 4-5 exercises maximum
- Keep it simple and achievable

Use this EXACT JSON format (no weeks_duration or week_number fields):
{
  "workout_name": "Descriptive program name",
  "description": "Brief overview of approach and focus",
  "days": [
    {
      "day_name": "Monday - Upper Push",
      "day_order": 1,
      "exercises": [
        {
          "name": "bench press",
          "exercise_order": 1,
          "sets": 3,
          "reps": "8-10",
          "rest_seconds": 90,
          "notes": "Focus on controlled eccentric, explosive concentric"
        }
      ]
    }
  ]
}

EXERCISE NAMING (CRITICAL):
Always use full exercise names with equipment type (e.g. 'barbell bench press' not 'bench press', 'seated cable row' not 'row'). Be specific so the exercise is unambiguous.

Use clear, specific exercise names:
- "barbell bench press" NOT just "bench press"
- "barbell squat" NOT just "squat"  
- "barbell deadlift"
- "pull up" or "chin up" (be specific)
- "dumbbell shoulder press"
- "dumbbell bicep curl"
- "seated cable row" or "barbell row" (be specific)
- "walking lunge" or "reverse lunge"
- "push up"`;

  if (userProfile) {
    basePrompt += `

USER'S PROFILE:
- Goal: ${userProfile.fitness_goal || 'Not specified'}
- Experience: ${userProfile.experience_level || 'Not specified'}
- Equipment: ${userProfile.available_equipment?.join(', ') || 'Not specified'}
- Workout Frequency: ${userProfile.workout_frequency || 'Not specified'} days/week
- Limitations: ${userProfile.limitations || 'None reported'}

DO NOT ASK ABOUT ANY OF THE ABOVE - YOU ALREADY HAVE THIS INFORMATION.
Tailor your coaching to this specific user profile.`;
  }

  return basePrompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, userId } = await req.json();
    console.log('Generating workout plan for conversation:', conversationId);



    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_fitness_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.log('No user profile found, continuing without it');
    }

      // OPTIMIZATION: Skip conversation history - just use profile directly
  const conversationHistory = [{
    role: 'user',
    content: 'Please create my personalized workout plan in JSON format based on my profile.'
  }];

    // Call Claude API
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
        system: getFitnessCoachSystemPrompt(userProfile),
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;
    console.log('Claude response received, length:', aiResponse.length);

    // Parse the JSON workout plan
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON found in response');
      throw new Error('No valid JSON found in AI response');
    }

    const jsonStr = jsonMatch[0];
    const workoutPlan = JSON.parse(jsonStr);
    console.log('Parsed workout plan:', workoutPlan.workout_name);

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
      console.error('Error inserting workout plan:', planError);
      throw planError;
    }

    console.log('Created workout plan:', plan.id);

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
        console.error('Error inserting workout day:', dayError);
        throw dayError;
      }

      console.log(`Created workout day: ${workoutDay.day_name}`);

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
          console.error('Error inserting exercise:', exerciseError);
          throw exerciseError;
        }
      }
    }

    // Link conversation to workout plan
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ workout_plan_id: plan.id })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      throw updateError;
    }

    // Save a summary message to the conversation (not the full JSON)
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: "Your plan is ready! 💪 Check it out in the Workouts tab."
      });

    console.log('Workout plan generation complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        workoutPlanId: plan.id,
        workoutName: workoutPlan.workout_name
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-workout-plan function:', error);
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
