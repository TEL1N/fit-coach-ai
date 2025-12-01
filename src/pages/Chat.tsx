import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileTabBar from "@/components/MobileTabBar";
import { Send, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendClaudeMessage } from "@/lib/claudeService";
import { getFitnessCoachSystemPrompt } from "@/lib/fitnessCoachPrompt";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatMessage = (content: string): string => {
    // Strip markdown formatting: bold (**), italics (*), and backticks (`)
    return content
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1')     // Remove italics
      .replace(/`(.+?)`/g, '$1');      // Remove backticks
  };

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Subtle swoosh sound for sending messages
  const playSendSound = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  // Soft pop sound for receiving messages
  const playReceiveSound = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from('user_fitness_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      setUserProfile(profile);

      // Load or create conversation
      let { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      let convId: string;

      if (!conversations || conversations.length === 0) {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({ user_id: session.user.id })
          .select()
          .single();

        if (error || !newConv) {
          toast({
            title: "Error",
            description: "Failed to create conversation",
            variant: "destructive",
          });
          return;
        }

        convId = newConv.id;

        // Send welcome message
        const welcomeMessage = `Hi! I'm your TailorFit AI coach. ${
          profile 
            ? `I see you want to ${profile.fitness_goal} and you're at ${profile.experience_level} level.` 
            : ''
        } Let's chat about your fitness journey! What questions do you have, or would you like me to create your personalized workout plan?`;

        const { data: welcomeMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: convId,
            role: 'assistant',
            content: welcomeMessage,
          })
          .select()
          .single();

        if (welcomeMsg) {
          setMessages([welcomeMsg as Message]);
        }
      } else {
        convId = conversations[0].id;

        // Load existing messages
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (existingMessages) {
          setMessages(existingMessages as Message[]);
        }
      }

      setConversationId(convId);
      setIsLoading(false);
    };

    initializeChat();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversationId || isSending) return;

    const userMessage = message.trim();
    setMessage("");
    setIsSending(true);
    
    // Play send sound
    playSendSound();

    try {
      // Add user message to UI
      const { data: newUserMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single();

      if (newUserMsg) {
        setMessages(prev => [...prev, newUserMsg as Message]);
      }

      // Prepare conversation history for Claude
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      conversationHistory.push({ role: 'user', content: userMessage });

      // Get AI response
      const systemPrompt = getFitnessCoachSystemPrompt(userProfile);
      const aiResponse = await sendClaudeMessage(conversationHistory, systemPrompt);

      // Save AI response
      const { data: aiMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse,
        })
        .select()
        .single();

      if (aiMsg) {
        setMessages(prev => [...prev, aiMsg as Message]);
        // Play receive sound
        playReceiveSound();
      }

      // Check if response contains JSON workout plan and save it
      if (aiResponse.includes('{') && aiResponse.includes('"workout_name"')) {
        try {
          // Extract JSON from the response
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const workoutPlan = JSON.parse(jsonMatch[0]);
            
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Save workout plan to database
            const { data: plan, error: planError } = await supabase
              .from('workout_plans')
              .insert({
                user_id: session.user.id,
                name: workoutPlan.workout_name,
                description: workoutPlan.description || null,
                weeks_duration: workoutPlan.weeks_duration || 4,
                is_active: true
              })
              .select()
              .single();

            if (planError || !plan) throw planError;

            // Save workout days and exercises
            for (const day of workoutPlan.days) {
              const { data: workoutDay, error: dayError } = await supabase
                .from('workout_days')
                .insert({
                  workout_plan_id: plan.id,
                  day_name: day.day_name,
                  day_order: day.day_order,
                  week_number: day.week_number || 1
                })
                .select()
                .single();

              if (dayError || !workoutDay) throw dayError;

              // Save exercises for this day
              for (const exercise of day.exercises) {
                await supabase
                  .from('workout_exercises')
                  .insert({
                    workout_day_id: workoutDay.id,
                    exercise_id: null, // Will link to WGER exercises later
                    exercise_order: exercise.exercise_order,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    rest_seconds: exercise.rest_seconds,
                    notes: exercise.notes || null
                  });
              }
            }

            // Show success message with navigation button
            toast({
              title: "Your plan is ready! 💪",
              description: "Click to view your personalized workout plan",
              action: (
                <Button 
                  size="sm" 
                  onClick={() => navigate("/workouts")}
                  className="ml-auto"
                >
                  View Plan
                </Button>
              ),
            });
          }
        } catch (error) {
          console.error('Error saving workout plan:', error);
          toast({
            title: "Error",
            description: "Failed to save workout plan. Please try again.",
            variant: "destructive",
          });
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateWorkoutPlan = async () => {
    setMessage("Please create my personalized workout plan in JSON format based on our conversation.");
    setTimeout(() => handleSendMessage(), 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-[75%] rounded-[20px] px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#007AFF] to-[#0051D5] text-white shadow-md'
                    : 'bg-[#E9E9EB] dark:bg-[#3A3A3C] text-foreground shadow-sm'
                }`}
              >
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal">
                  {msg.role === 'assistant' 
                    ? (msg.content.includes('{') && msg.content.includes('"workout_name"')
                        ? "Your plan is ready! 💪 Check it out in the Workouts tab."
                        : formatMessage(msg.content))
                    : msg.content}
                </p>
                <p className={`text-[11px] mt-1 ${
                  msg.role === 'user' 
                    ? 'text-white/70' 
                    : 'text-muted-foreground/60'
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="mb-3 flex justify-start animate-fade-in">
              <div className="max-w-[75%] rounded-[20px] px-4 py-3 bg-[#E9E9EB] dark:bg-[#3A3A3C] shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-card/95 backdrop-blur-xl px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleGenerateWorkoutPlan}
            disabled={isSending}
            className="w-full mb-3 h-11 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate My Workout Plan
          </Button>
          
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-muted/50 rounded-full px-4 py-1.5 border border-border/30">
              <Input
                placeholder="Message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="border-0 bg-transparent h-9 px-0 text-[15px] placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isSending}
              />
            </div>
            <Button 
              size="icon" 
              className="h-9 w-9 rounded-full flex-shrink-0 bg-primary hover:bg-primary/90 shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
              disabled={!message.trim() || isSending}
              onClick={handleSendMessage}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Chat;