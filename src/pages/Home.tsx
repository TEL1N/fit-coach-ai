import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MobileTabBar from "@/components/MobileTabBar";
import { MessageSquare, Dumbbell, TrendingUp, Flame, Calendar, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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
        <div className="shimmer w-12 h-12 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Premium Header with Gradient */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-energy px-6 pt-12 pb-16 flex-shrink-0 relative overflow-hidden" 
        style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-black mb-2 text-white tracking-tight">Welcome back!</h1>
            <p className="text-white/80 font-medium">
              {user?.email?.split("@")[0] || "Fitness enthusiast"}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 px-4 -mt-8 overflow-y-auto min-h-0" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
        {/* Stats Cards with Staggered Animation */}
        <motion.div 
          className="grid grid-cols-3 gap-3 mb-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {[
            { icon: Flame, value: "0", label: "Day Streak", gradient: "gradient-secondary" },
            { icon: Dumbbell, value: "0", label: "This Week", gradient: "gradient-primary" },
            { icon: TrendingUp, value: "0", label: "Total", gradient: "gradient-energy" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <Card className="p-4 text-center glass-card border-white/10 shadow-premium relative overflow-hidden group">
                <div className={`absolute inset-0 ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Today's Workout - Premium Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 mb-4 glass-strong border-white/10 shadow-floating relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 gradient-primary opacity-20 blur-3xl rounded-full"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1 tracking-tight">Today's Workout</h3>
                  <p className="text-sm text-muted-foreground font-medium">No workout scheduled</p>
                </div>
                <div className="p-2.5 rounded-xl gradient-primary shadow-glow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm mb-4 text-muted-foreground">
                Start a chat with your AI coach to create your personalized workout plan!
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons with Animations */}
        <motion.div 
          className="space-y-3 mb-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.4
              }
            }
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 }
            }}
          >
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button 
                className="w-full h-16 text-base font-bold rounded-3xl shadow-floating gradient-primary hover:shadow-glow-lg transition-all duration-300 relative overflow-hidden group"
                onClick={() => navigate("/chat")}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Sparkles className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Chat with AI Coach</span>
              </Button>
            </motion.div>
          </motion.div>
          
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 }
            }}
          >
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button 
                variant="outline" 
                className="w-full h-16 text-base font-bold rounded-3xl glass-card border-white/20 hover:bg-white/5 transition-all duration-300"
                onClick={() => navigate("/workouts")}
              >
                <Dumbbell className="w-5 h-5 mr-2" />
                View My Workouts
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Motivational Tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 glass-card border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl gradient-secondary shadow-glow-sm flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold mb-1 tracking-tight">Daily Tip</p>
                <p className="text-sm text-muted-foreground">
                  Consistency beats intensity. Small daily improvements lead to stunning results over time.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Home;
