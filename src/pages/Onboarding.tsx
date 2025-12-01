import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import welcomeImage from "@/assets/onboarding-welcome.jpg";

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [workoutFrequency, setWorkoutFrequency] = useState(3);
  const [limitations, setLimitations] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth?mode=signup");
      }
    });
  }, [navigate]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleEquipment = (item: string) => {
    // Exclusive selections
    if (item === "full_gym" || item === "bodyweight") {
      setEquipment([item]);
      return;
    }
    
    // If selecting anything else, remove exclusive options
    const filteredEquipment = equipment.filter(e => e !== "full_gym" && e !== "bodyweight");
    
    if (filteredEquipment.includes(item)) {
      setEquipment(filteredEquipment.filter(e => e !== item));
    } else {
      setEquipment([...filteredEquipment, item]);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("user_fitness_profiles")
        .insert({
          user_id: user.id,
          fitness_goal: fitnessGoal,
          experience_level: experienceLevel,
          available_equipment: equipment,
          workout_frequency: workoutFrequency,
          limitations: limitations || null,
        });

      if (error) throw error;

      toast.success("Profile created! Let's start your fitness journey!");
      navigate("/home");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return fitnessGoal !== "";
      case 2: return experienceLevel !== "";
      case 3: return equipment.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const goals = [
    { value: "build_muscle", label: "Build Muscle", icon: "💪" },
    { value: "lose_weight", label: "Lose Weight", icon: "🔥" },
    { value: "general_fitness", label: "General Fitness", icon: "⚡" },
    { value: "increase_strength", label: "Increase Strength", icon: "🏋️" },
    { value: "improve_endurance", label: "Improve Endurance", icon: "🏃" },
  ];

  const experiences = [
    { value: "complete_beginner", label: "Complete Beginner", desc: "Never worked out before", icon: "🌱" },
    { value: "returning", label: "Returning After Break", desc: "Had experience, getting back into it", icon: "🔄" },
    { value: "occasional", label: "Occasional Exerciser", desc: "Work out sometimes, not consistent", icon: "🎯" },
    { value: "regular", label: "Regular Gym-Goer", desc: "Consistent training, know the basics", icon: "💪" },
    { value: "experienced", label: "Experienced Lifter", desc: "Years of consistent training", icon: "📈" },
    { value: "advanced", label: "Advanced Athlete", desc: "Competitive level or very advanced", icon: "🔥" },
  ];

  const equipmentOptions = [
    { value: "full_gym", label: "Full Commercial Gym", desc: "Access to everything", icon: "🏢" },
    { value: "barbell", label: "Barbell", icon: "🏋️", category: "home" },
    { value: "dumbbells", label: "Dumbbells", icon: "💪", category: "home" },
    { value: "squat_rack", label: "Squat Rack", icon: "🦵", category: "home" },
    { value: "bench", label: "Bench", icon: "🪑", category: "home" },
    { value: "pullup_bar", label: "Pull-up Bar", icon: "🎯", category: "home" },
    { value: "cable_machine", label: "Cable Machine", icon: "🏋️‍♂️", category: "home" },
    { value: "kettlebells", label: "Kettlebells", icon: "⚫", category: "home" },
    { value: "resistance_bands", label: "Resistance Bands", icon: "🔗", category: "home" },
    { value: "bodyweight", label: "Bodyweight Only", desc: "No equipment needed", icon: "🤸" },
  ];

  const workoutIntensities = [
    { value: "light", label: "Light", desc: "1-2 days/week", detail: "Perfect for busy schedules", icon: "💤", frequency: 2 },
    { value: "moderate", label: "Moderate", desc: "3-4 days/week", detail: "Balanced approach", icon: "📊", frequency: 4 },
    { value: "intense", label: "Intense", desc: "5-7 days/week", detail: "Maximum commitment", icon: "🔥", frequency: 6 },
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Indicator */}
      <div className="px-6 pt-safe pb-2 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep + 1}/5
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div 
          className="h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentStep * 100}%)` }}
        >
          {/* Screen 1 - Welcome */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col overflow-y-auto">
            <div 
              className="w-full h-64 rounded-3xl mb-8 overflow-hidden"
              style={{
                backgroundImage: `url(${welcomeImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <h1 className="text-4xl font-bold mb-4">Welcome to TailorFit!</h1>
            <p className="text-xl text-muted-foreground">
              Let's personalize your fitness journey
            </p>
          </div>

          {/* Screen 2 - Fitness Goal */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6">What's your primary goal?</h2>
            <div className="space-y-3 pb-4">
              {goals.map((goal) => (
                <Card
                  key={goal.value}
                  className={`p-6 cursor-pointer transition-all ${
                    fitnessGoal === goal.value
                      ? "border-primary border-2 bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setFitnessGoal(goal.value)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{goal.icon}</span>
                    <span className="text-lg font-semibold">{goal.label}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Screen 3 - Experience Level */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6">What's your experience level?</h2>
            <p className="text-muted-foreground mb-4">Choose what best describes you</p>
            <div className="space-y-3 pb-4">
              {experiences.map((exp) => (
                <Card
                  key={exp.value}
                  className={`p-5 cursor-pointer transition-all ${
                    experienceLevel === exp.value
                      ? "border-primary border-2 bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setExperienceLevel(exp.value)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{exp.icon}</span>
                    <div>
                      <p className="text-base font-semibold mb-1">{exp.label}</p>
                      <p className="text-sm text-muted-foreground">{exp.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Screen 4 - Equipment */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col overflow-y-auto">
            <h2 className="text-3xl font-bold mb-4">What equipment do you have?</h2>
            <p className="text-muted-foreground mb-4">Select all that apply</p>
            <div className="space-y-3 pb-4">
              {equipmentOptions.map((item) => {
                const isDisabled = 
                  (equipment.includes("full_gym") && item.value !== "full_gym") ||
                  (equipment.includes("bodyweight") && item.value !== "bodyweight");
                
                return (
                  <Card
                    key={item.value}
                    className={`p-5 cursor-pointer transition-all ${
                      equipment.includes(item.value)
                        ? "border-primary border-2 bg-primary/5"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => !isDisabled && toggleEquipment(item.value)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <p className="text-base font-semibold mb-0.5">{item.label}</p>
                        {item.desc && (
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Screen 5 - Schedule & Limitations */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col overflow-y-auto">
            <h2 className="text-3xl font-bold mb-8">Final details</h2>
            
            <div className="space-y-6 pb-4">
              <div>
                <p className="text-lg font-semibold mb-4">
                  How often can you workout?
                </p>
                <div className="space-y-3">
                  {workoutIntensities.map((intensity) => (
                    <Card
                      key={intensity.value}
                      className={`p-6 cursor-pointer transition-all ${
                        workoutFrequency === intensity.frequency
                          ? "border-primary border-2 bg-primary/5"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => setWorkoutFrequency(intensity.frequency)}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl">{intensity.icon}</span>
                        <div>
                          <p className="text-lg font-semibold mb-1">{intensity.label}</p>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{intensity.desc}</p>
                          <p className="text-xs text-muted-foreground">{intensity.detail}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-lg font-semibold mb-4">
                  Any injuries or limitations?
                </p>
                <Textarea
                  placeholder="e.g., lower back pain, knee injury..."
                  value={limitations}
                  onChange={(e) => setLimitations(e.target.value)}
                  className="min-h-32 text-base rounded-2xl resize-none"
                />
                <p className="text-sm text-muted-foreground mt-2">Optional</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons - Fixed at bottom */}
      <div className="px-6 py-4 space-y-3 border-t border-border flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {currentStep === 0 ? (
          <Button
            onClick={handleNext}
            size="lg"
            className="w-full h-14 text-base rounded-2xl"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        ) : currentStep === 4 ? (
          <>
            <Button
              onClick={handleComplete}
              size="lg"
              className="w-full h-14 text-base rounded-2xl"
              disabled={!isStepValid() || isLoading}
            >
              {isLoading ? "Setting up..." : "Complete Setup"}
            </Button>
            <Button
              onClick={handleBack}
              variant="outline"
              size="lg"
              className="w-full h-14 text-base rounded-2xl"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleNext}
              size="lg"
              className="w-full h-14 text-base rounded-2xl"
              disabled={!isStepValid()}
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={handleBack}
              variant="outline"
              size="lg"
              className="w-full h-14 text-base rounded-2xl"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;