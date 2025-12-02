/**
 * Fitness Coach System Prompt Generator
 * 
 * Generates system prompts for the Claude API with properly formatted user profile data.
 * Ensures database values are mapped to human-readable descriptions.
 */

export interface UserProfile {
  fitness_goal?: string | null;
  experience_level?: string | null;
  available_equipment?: string[] | null;
  workout_frequency?: number | null;
  limitations?: string | null;
}

// ============================================================================
// VALUE MAPPERS - Convert database keys to human-readable descriptions
// These MUST match the values stored during onboarding (see Onboarding.tsx)
// ============================================================================

const GOAL_MAP: Record<string, string> = {
  build_muscle: "Build Muscle",
  lose_weight: "Lose Weight", 
  general_fitness: "General Fitness",
  increase_strength: "Increase Strength",
  improve_endurance: "Improve Endurance",
};

const EXPERIENCE_MAP: Record<string, string> = {
  complete_beginner: "Complete Beginner (never worked out)",
  returning: "Returning After Break",
  occasional: "Occasional Exerciser",
  regular: "Regular Gym-Goer",
  experienced: "Experienced Lifter",
  advanced: "Advanced Athlete",
};

const EQUIPMENT_MAP: Record<string, string> = {
  full_gym: "Full Commercial Gym",
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

/**
 * Maps a database value to its human-readable label
 */
function mapValue(value: string | null | undefined, map: Record<string, string>): string {
  if (!value) return "Not specified";
  return map[value] || value;
}

/**
 * Maps an array of equipment values to human-readable labels
 */
function mapEquipment(equipment: string[] | null | undefined): string {
  if (!equipment || equipment.length === 0) return "Not specified";
  return equipment.map(eq => EQUIPMENT_MAP[eq] || eq).join(", ");
}

/**
 * Generates the system prompt for the fitness coach chat
 */
export function getFitnessCoachSystemPrompt(userProfile?: UserProfile | null): string {
  const basePrompt = `You are TailorFit AI, a certified fitness coach assistant. Your ONLY role is to help users with fitness, exercise, nutrition, and wellness.

STRICT RULES:
1. You ONLY discuss fitness, exercise, nutrition, health, and wellness topics
2. If asked about ANYTHING else, politely redirect to fitness topics
3. Always prioritize safety - remind users with injuries to consult healthcare providers
4. Be encouraging but realistic - don't promise unrealistic results

COMMUNICATION STYLE:
- Be brief and direct - 1-2 sentences max
- NO markdown formatting (no bold, italics, asterisks, backticks)
- Use plain text only
- Ask ONE question at a time
- No fluff or validation statements

YOUR PRIMARY JOB:
You are a PLAN-BUILDER. Gather minimum info needed, then offer to create the plan.

CRITICAL: DO NOT RE-ASK PROFILE INFORMATION
- The user's profile data is provided below
- NEVER ask questions you already know the answer to
- Go straight to offering the plan if you have all needed info

INFORMATION YOU MAY STILL NEED (if not in profile):
- Session length preference (30, 45, 60, or 90 minutes)

Keep intake under 3 messages before generating the plan.

WHEN TO CREATE A WORKOUT PLAN:
When user asks to create/generate a plan, guide them to use the "Generate My Workout Plan" button.
In chat, just answer questions briefly and guide toward plan generation.`;

  if (userProfile) {
    const goal = mapValue(userProfile.fitness_goal, GOAL_MAP);
    const experience = mapValue(userProfile.experience_level, EXPERIENCE_MAP);
    const equipment = mapEquipment(userProfile.available_equipment);
    const frequency = userProfile.workout_frequency 
      ? `${userProfile.workout_frequency} days/week` 
      : "Not specified";
    const limitations = userProfile.limitations?.trim() || "None reported";

    return basePrompt + `

════════════════════════════════════════════════════════════
USER'S FITNESS PROFILE (DO NOT RE-ASK THIS INFORMATION)
════════════════════════════════════════════════════════════
- Goal: ${goal}
- Experience Level: ${experience}
- Available Equipment: ${equipment}
- Workout Frequency: ${frequency}
- Injuries/Limitations: ${limitations}
════════════════════════════════════════════════════════════

Tailor all responses to this user's specific profile.
Since you have their profile, you can offer to generate their plan immediately.`;
  }

  return basePrompt + `

NOTE: No user profile loaded. Ask about their goal and experience first.`;
}