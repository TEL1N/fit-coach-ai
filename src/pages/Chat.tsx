import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileTabBar from "@/components/MobileTabBar";
import ConversationSelector from "@/components/ConversationSelector";
import { Send, Zap, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendClaudeMessage } from "@/lib/claudeService";
import { getFitnessCoachSystemPrompt } from "@/lib/fitnessCoachPrompt";
import { useChatContext } from "@/contexts/ChatContext";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    messages,
    conversationId,
    workoutPlanId,
    userProfile,
    isLoading,
    setMessages,
    setConversationId,
    setWorkoutPlanId,
    loadConversation,
  } = useChatContext();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
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

  const handleConversationChange = async (newConvId: string | null) => {
    if (newConvId === null) {
      // Start completely new conversation - clear everything
      setConversationId(null);
      setWorkoutPlanId(null);
      setMessages([]); // Clear all messages
      
      // Create a new conversation immediately
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user_id: session.user.id })
        .select()
        .single();

      if (newConv) {
        setConversationId(newConv.id);
        
        // Send welcome message
        const welcomeMessage = `Hi! I'm your TailorFit AI coach. ${
          userProfile 
            ? `I see you want to ${userProfile.fitness_goal} and you're at ${userProfile.experience_level} level.` 
            : ''
        } Let's chat about your fitness journey! What questions do you have, or would you like me to create your personalized workout plan?`;

        const { data: welcomeMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: newConv.id,
            role: 'assistant',
            content: welcomeMessage,
          })
          .select()
          .single();

        if (welcomeMsg) {
          setMessages([welcomeMsg as Message]);
        }
      }
    } else {
      // Load existing conversation - completely replace current state
      await loadConversation(newConvId);
    }
  };

  useEffect(() => {
    // Check if we're navigating from Workouts with a conversation ID
    const state = location.state as { conversationId?: string };
    if (state?.conversationId) {
      loadConversation(state.conversationId);
      // Clear the location state after loading
      window.history.replaceState({}, document.title);
      return;
    }

    // Check auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

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

      // Get AI response with higher token limit for workout plans
      const systemPrompt = getFitnessCoachSystemPrompt(userProfile);
      const isWorkoutPlanRequest = userMessage.toLowerCase().includes('workout plan') || 
                                   userMessage.toLowerCase().includes('create my') ||
                                   userMessage.toLowerCase().includes('personalized') ||
                                   userMessage.toLowerCase().includes('plan');
      const maxTokens = isWorkoutPlanRequest ? 8192 : 2048;
      
      const aiResponse = await sendClaudeMessage(conversationHistory, systemPrompt, maxTokens);

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
          console.log('Detected workout plan JSON in response');
          console.log('Raw AI Response:', aiResponse);
          
          // Use regex to extract JSON between first { and last }
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          
          if (!jsonMatch) {
            console.error('Could not extract JSON from response');
            throw new Error('No valid JSON found in response');
          }
          
          const jsonStr = jsonMatch[0];
          console.log('Extracted JSON length:', jsonStr.length);
          console.log('Extracted JSON preview:', jsonStr.substring(0, 300));
          
          const workoutPlan = JSON.parse(jsonStr);
          console.log('Successfully parsed workout plan:', workoutPlan);
          console.log('Days count:', workoutPlan.days?.length || 0);
          
          // Get current user
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('No active session');
          }

          // Save workout plan to database
          const { data: plan, error: planError } = await supabase
            .from('workout_plans')
            .insert({
              user_id: session.user.id,
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
          
          if (!plan) {
            throw new Error('No plan returned from insert');
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
            
            if (!workoutDay) {
              throw new Error('No workout day returned from insert');
            }

            console.log(`Created workout day: ${workoutDay.day_name}`);

            // Save exercises for this day
            for (let i = 0; i < day.exercises.length; i++) {
              const exercise = day.exercises[i];
              const { error: exerciseError } = await supabase
                .from('workout_exercises')
                .insert({
                  workout_day_id: workoutDay.id,
                  exercise_id: null, // Will link to WGER exercises later
                  exercise_name: exercise.name, // Store the exercise name
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
              
              console.log(`Created exercise: ${exercise.name}`);
            }
          }

          console.log('Workout plan saved successfully!');

          // Link conversation to workout plan
          await supabase
            .from('conversations')
            .update({ workout_plan_id: plan.id })
            .eq('id', conversationId);
          
          setWorkoutPlanId(plan.id);

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
        } catch (error: any) {
          console.error('❌ Error parsing or saving workout plan:', error);
          console.error('📏 AI Response length:', aiResponse.length);
          console.error('📄 Full AI Response:', aiResponse);
          console.error('🔍 Error details:', error instanceof Error ? error.message : 'Unknown error');
          
          toast({
            title: "Unable to create workout plan",
            description: "The plan couldn't be parsed. Check console for details.",
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
    if (!conversationId || isSending) return;

    setIsSending(true);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the edge function to generate workout plan
      const { data, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: { 
          conversationId,
          userId: session.user.id 
        }
      });

      if (error) throw error;

      if (data?.success) {
        console.log('Workout plan generated:', data.workoutName);
        
        // Reload messages to get the AI's response
        const { data: newMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (newMessages) {
          setMessages(newMessages as Message[]);
        }

        setWorkoutPlanId(data.workoutPlanId);
        
        // Play receive sound
        playReceiveSound();

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
      } else {
        throw new Error(data?.error || 'Failed to generate workout plan');
      }

    } catch (error) {
      console.error('Error generating workout plan:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate workout plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="shimmer w-12 h-12 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Conversation Selector */}
      <ConversationSelector 
        currentConversationId={conversationId}
        onConversationChange={handleConversationChange}
      />

      {/* View Plan Button - shown when conversation has linked workout plan */}
      {workoutPlanId && (
        <div className="px-6 py-3 border-b border-border/30 glass-card">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-sm font-medium glass-card border-white/20"
            onClick={() => navigate("/workouts")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Workout Plan
          </Button>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div className="flex-1 px-6 py-8 overflow-y-auto min-h-0" style={{ paddingBottom: 'calc(14rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-[75%] rounded-[24px] px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'gradient-primary text-white shadow-glow-sm'
                    : 'glass-card border-white/10 text-foreground shadow-premium'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-[24px] pointer-events-none"></div>
                )}
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal relative z-10">
                  {msg.role === 'assistant' 
                    ? (msg.content.includes('{') && msg.content.includes('"workout_name"')
                        ? "Your plan is ready! 💪 Check it out in the Workouts tab."
                        : formatMessage(msg.content))
                    : msg.content}
                </p>
                <p className={`text-[11px] mt-1 relative z-10 ${
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
              <div className="max-w-[75%] rounded-[24px] px-4 py-3 glass-card border-white/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at Bottom Above Nav */}
      <div 
        className="fixed left-0 right-0 glass-strong border-t border-white/10 px-6 py-4 shadow-floating z-40"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleGenerateWorkoutPlan}
            disabled={isSending}
            className="w-full mb-4 h-12 rounded-full gradient-energy shadow-glow-md font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-glow-lg"
          >
            {isSending ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Generating Your Plan...</span>
                </div>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate My Workout Plan
              </>
            )}
          </Button>
          
          <div className="flex gap-3 items-end">
            <div className="flex-1 glass-card border-white/20 rounded-full px-5 py-2 transition-all duration-200 focus-within:border-primary focus-within:shadow-glow-sm">
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
              className="h-10 w-10 rounded-full flex-shrink-0 gradient-primary shadow-glow-md transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-glow-lg"
              disabled={!message.trim() || isSending}
              onClick={handleSendMessage}
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

export default Chat;