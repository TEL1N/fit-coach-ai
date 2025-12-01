import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MobileTabBar from "@/components/MobileTabBar";
import { LogOut, User as UserIcon, Settings, HelpCircle, Info } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

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
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 px-6 -mt-4 overflow-y-auto min-h-0" style={{ paddingBottom: 'calc(5rem + max(1rem, env(safe-area-inset-bottom)))' }}>
        {/* Stats Card */}
        <Card className="p-6 mb-4">
          <h3 className="font-semibold mb-4">Your Progress</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Workouts Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </Card>

        {/* Settings Options */}
        <div className="space-y-2 mb-4">
          <Button 
            variant="outline" 
            className="w-full h-14 justify-start rounded-xl"
            disabled
          >
            <Settings className="w-5 h-5 mr-3 text-muted-foreground" />
            <span>Settings</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 justify-start rounded-xl"
            disabled
          >
            <HelpCircle className="w-5 h-5 mr-3 text-muted-foreground" />
            <span>Help & Support</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 justify-start rounded-xl"
            disabled
          >
            <Info className="w-5 h-5 mr-3 text-muted-foreground" />
            <span>About TailorFit</span>
          </Button>
        </div>

        {/* Sign Out */}
        <Button 
          variant="destructive"
          className="w-full h-14 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>

        {/* App Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>TailorFit v1.0.0</p>
          <p className="mt-1">Your AI-powered fitness journey</p>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Profile;