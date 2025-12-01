import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileTabBar from "@/components/MobileTabBar";
import { Calendar, Clock, Dumbbell, Plus } from "lucide-react";

const Workouts = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 safe-area-top">
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <p className="text-sm text-muted-foreground">Your personalized training plans</p>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Empty State */}
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Workout Plans Yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Chat with your AI coach to create your first personalized workout plan!
          </p>
          <Button 
            className="w-full h-12 rounded-xl"
            onClick={() => navigate("/chat")}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Workout Plan
          </Button>
        </Card>

        {/* Coming Soon - Example of what workout cards will look like */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Coming Soon</h3>
          
          <Card className="p-4 mb-3 opacity-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold mb-1">Push Day</h4>
                <p className="text-sm text-muted-foreground">Upper body strength</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Monday</p>
                <p className="text-xs text-muted-foreground">Week 1</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Dumbbell className="w-4 h-4" />
                <span>6 exercises</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>45 min</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 opacity-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold mb-1">Pull Day</h4>
                <p className="text-sm text-muted-foreground">Back and biceps focus</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Wednesday</p>
                <p className="text-xs text-muted-foreground">Week 1</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Dumbbell className="w-4 h-4" />
                <span>7 exercises</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>50 min</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Workouts;