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
    if (equipment.includes(item)) {
      setEquipment(equipment.filter(e => e !== item));
    } else {
      setEquipment([...equipment, item]);
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
    { value: "beginner", label: "Beginner", desc: "Just starting out", icon: "🌱" },
    { value: "intermediate", label: "Intermediate", desc: "Regular gym-goer", icon: "📈" },
    { value: "advanced", label: "Advanced", desc: "Years of training", icon: "🔥" },
  ];

  const equipmentOptions = [
    { value: "full_gym", label: "Full Gym Access", icon: "🏢" },
    { value: "barbell", label: "Barbell", icon: "🏋️" },
    { value: "dumbbells", label: "Dumbbells", icon: "💪" },
    { value: "kettlebells", label: "Kettlebells", icon: "⚫" },
    { value: "resistance_bands", label: "Resistance Bands", icon: "🔗" },
    { value: "pullup_bar", label: "Pull-up Bar", icon: "🎯" },
    { value: "bodyweight", label: "Bodyweight Only", icon: "🤸" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
      {/* Progress Indicator */}
      <div className="px-6 pt-4 pb-2">
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

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentStep * 100}%)` }}
        >
          {/* Screen 1 - Welcome */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col">
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
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col">
            <h2 className="text-3xl font-bold mb-8">What's your primary goal?</h2>
            <div className="space-y-3 flex-1 overflow-y-auto">
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
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col">
            <h2 className="text-3xl font-bold mb-8">What's your experience level?</h2>
            <div className="space-y-4 flex-1">
              {experiences.map((exp) => (
                <Card
                  key={exp.value}
                  className={`p-6 cursor-pointer transition-all ${
                    experienceLevel === exp.value
                      ? "border-primary border-2 bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setExperienceLevel(exp.value)}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{exp.icon}</span>
                    <div>
                      <p className="text-lg font-semibold mb-1">{exp.label}</p>
                      <p className="text-sm text-muted-foreground">{exp.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Screen 4 - Equipment */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col">
            <h2 className="text-3xl font-bold mb-4">What equipment do you have?</h2>
            <p className="text-muted-foreground mb-6">Select all that apply</p>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {equipmentOptions.map((item) => (
                <Card
                  key={item.value}
                  className={`p-5 cursor-pointer transition-all ${
                    equipment.includes(item.value)
                      ? "border-primary border-2 bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleEquipment(item.value)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-base font-semibold">{item.label}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Screen 5 - Schedule & Limitations */}
          <div className="w-full flex-shrink-0 px-6 py-8 flex flex-col">
            <h2 className="text-3xl font-bold mb-8">Final details</h2>
            
            <div className="space-y-8 flex-1">
              <div>
                <p className="text-lg font-semibold mb-4">
                  How many days per week can you workout?
                </p>
                <div className="flex gap-2 justify-between">
                  {[2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      onClick={() => setWorkoutFrequency(num)}
                      className={`flex-1 h-14 rounded-2xl font-semibold transition-all ${
                        workoutFrequency === num
                          ? "bg-primary text-primary-foreground shadow-lg scale-105"
                          : "bg-card border-2 border-border hover:bg-accent"
                      }`}
                    >
                      {num}
                    </button>
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

      {/* Navigation Buttons */}
      <div className="px-6 py-6 space-y-3 border-t border-border">
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