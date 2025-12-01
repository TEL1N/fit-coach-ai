import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileTabBar from "@/components/MobileTabBar";
import { Send, Sparkles } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

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
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 safe-area-top">
        <h1 className="text-2xl font-bold">AI Coach</h1>
        <p className="text-sm text-muted-foreground">Your personal fitness assistant</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Welcome Message */}
        <Card className="p-6 mb-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium mb-2">Hi! I'm your AI fitness coach.</p>
              <p className="text-sm text-muted-foreground">
                Tell me about your fitness goals, experience level, and available equipment. 
                I'll create a personalized workout plan just for you!
              </p>
            </div>
          </div>
        </Card>

        {/* Example prompts */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium mb-3">Try asking:</p>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-3 px-4 rounded-xl text-left"
            onClick={() => setMessage("I want to build muscle, I'm a beginner with dumbbells at home")}
          >
            <span className="text-sm">I want to build muscle, I'm a beginner with dumbbells at home</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-3 px-4 rounded-xl text-left"
            onClick={() => setMessage("Create a 3-day workout plan for weight loss")}
          >
            <span className="text-sm">Create a 3-day workout plan for weight loss</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-3 px-4 rounded-xl text-left"
            onClick={() => setMessage("I have a home gym and want to get stronger")}
          >
            <span className="text-sm">I have a home gym and want to get stronger</span>
          </Button>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-6 py-4 safe-area-bottom">
        <div className="flex gap-2">
          <Input
            placeholder="Message your AI coach..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-12 rounded-xl"
          />
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-xl flex-shrink-0"
            disabled={!message.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Chat;