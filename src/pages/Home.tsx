import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MobileTabBar from "@/components/MobileTabBar";
import { MessageSquare, Dumbbell, TrendingUp, Flame, Calendar } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from("user_fitness_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .single();
        
        if (!profile) {
          navigate("/onboarding");
          return;
        }
      } else {
        navigate("/auth");
      }
      setIsLoading(false);
    };

    checkUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background px-6 pt-12 pb-8 flex-shrink-0" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">
          {user?.email?.split("@")[0] || "Fitness enthusiast"}
        </p>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 px-6 -mt-4 overflow-y-auto min-h-0" style={{ paddingBottom: 'calc(5rem + max(1rem, env(safe-area-inset-bottom)))' }}>
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </Card>
          <Card className="p-4 text-center">
            <Dumbbell className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
        </div>

        {/* Today's Workout */}
        <Card className="p-6 mb-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Today's Workout</h3>
              <p className="text-sm text-muted-foreground">No workout scheduled</p>
            </div>
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm mb-4 text-muted-foreground">
            Start a chat with your AI coach to create your personalized workout plan!
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full h-14 text-base rounded-2xl shadow-lg"
            onClick={() => navigate("/chat")}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Chat with AI Coach
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 text-base rounded-2xl"
            onClick={() => navigate("/workouts")}
          >
            <Dumbbell className="w-5 h-5 mr-2" />
            View My Workouts
          </Button>
        </div>

        {/* Motivational Tip */}
        <Card className="mt-6 p-6 bg-card">
          <p className="text-sm font-medium mb-2">💡 Daily Tip</p>
          <p className="text-sm text-muted-foreground">
            Consistency beats intensity. Small daily improvements lead to stunning results over time.
          </p>
        </Card>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Home;