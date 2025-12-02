import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileTabBar from "@/components/MobileTabBar";
import ConversationSelector from "@/components/ConversationSelector";
import UpgradeModal from "@/components/UpgradeModal";
import TypingIndicator from "@/components/TypingIndicator";
import { Send, Zap, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendClaudeMessage } from "@/lib/claudeService";
import { getFitnessCoachSystemPrompt } from "@/lib/fitnessCoachPrompt";
import { useChatContext } from "@/contexts/ChatContext";
import { useWorkoutPlan } from "@/contexts/WorkoutPlanContext";

// Welcome messages for new conversations
const WELCOME_MESSAGES = [
  "Hi, I'm TailorFit! Your AI-powered personal trainer, built to craft the perfect workout plan tailored just for you.",
  "I've already created a starter plan based on your profile. Want to ease into it? Go harder? Work around an injury? Just tell me what you need and I'll adjust your plan."
];

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
    refreshUserProfile,
    setHasUsedFreeModification,
  } = useChatContext();
  const { workoutPlan, setWorkoutPlanDirectly, refreshWorkoutPlan } = useWorkoutPlan();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  
  // Welcome sequence state
  const [welcomeStep, setWelcomeStep] = useState(0); // 0 = not started, 1 = first msg, 2 = second msg, 3 = done
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [welcomeMessages, setWelcomeMessages] = useState<Message[]>([]);
  const welcomeSequenceStartedRef = useRef(false);
  
  // Sync hasExistingPlan with workoutPlan from context
  useEffect(() => {
    if (workoutPlan) {
      setHasExistingPlan(true);
    }
  }, [workoutPlan]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
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
  }, [messages, welcomeMessages, showTypingIndicator]);

  // Welcome sequence animation effect
  useEffect(() => {
    // Only start welcome sequence for new conversations with no messages
    if (!isLoading && conversationId && messages.length === 0 && welcomeStep === 0 && !welcomeSequenceStartedRef.current) {
      welcomeSequenceStartedRef.current = true;
      
      // Start the welcome sequence
      setShowTypingIndicator(true);
      
      // First message after 1.5s
      const timer1 = setTimeout(() => {
        setShowTypingIndicator(false);
        const firstMsg: Message = {
          id: 'welcome-1',
          role: 'assistant',
          content: WELCOME_MESSAGES[0],
          created_at: new Date().toISOString()
        };
        setWelcomeMessages([firstMsg]);
        setWelcomeStep(1);
        playReceiveSound();
        
        // Show typing indicator for second message
        setTimeout(() => {
          setShowTypingIndicator(true);
          
          // Second message after 1s more
          setTimeout(() => {
            setShowTypingIndicator(false);
            const secondMsg: Message = {
              id: 'welcome-2',
              role: 'assistant',
              content: WELCOME_MESSAGES[1],
              created_at: new Date().toISOString()
            };
            setWelcomeMessages(prev => [...prev, secondMsg]);
            setWelcomeStep(2);
            playReceiveSound();
            
            // Save welcome messages to database
            saveWelcomeMessages(conversationId);
          }, 1000);
        }, 500);
      }, 1500);
      
      return () => clearTimeout(timer1);
    }
  }, [isLoading, conversationId, messages.length, welcomeStep]);

  // Function to save welcome messages to database
  const saveWelcomeMessages = async (convId: string) => {
    try {
      // Insert both welcome messages
      for (const content of WELCOME_MESSAGES) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: convId,
            role: 'assistant',
            content: content,
          });
      }
      console.log('[Chat] Welcome messages saved to database');
    } catch (error) {
      console.error('[Chat] Error saving welcome messages:', error);
    }
  };

  const handleConversationChange = async (newConvId: string | null) => {
    if (newConvId === null) {
      // Check if user already has a conversation (free tier: 1 plan, 1 chat)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', session.user.id);

      if (conversations && conversations.length >= 1) {
        setIsUpgradeModalOpen(true);
        return;
      }

      // Start completely new conversation - clear everything
      setConversationId(null);
      setWorkoutPlanId(null);
      setMessages([]); // Clear all messages
      
      // Create a new conversation immediately
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user_id: session.user.id })
        .select()
        .single();

      if (newConv) {
        setConversationId(newConv.id);
        
        // Send welcome message - use profile if available
        let welcomeMessage = "I'm TailorFit. ";
        
        if (userProfile) {
          const frequency = userProfile.workout_frequency ? `${userProfile.workout_frequency}-day` : '';
          const goal = userProfile.fitness_goal || 'your fitness goals';
          
          // Map equipment from database keys to readable names
          const EQUIPMENT_DISPLAY_MAP: Record<string, string> = {
            'full_gym': 'full gym equipment',
            'bodyweight': 'bodyweight only',
            'barbell': 'barbell',
            'dumbbells': 'dumbbells',
            'squat_rack': 'squat rack',
            'bench': 'bench',
            'pullup_bar': 'pull-up bar',
            'cable_machine': 'cable machine',
            'kettlebells': 'kettlebells',
            'resistance_bands': 'resistance bands',
          };
          
          let equipment = 'available equipment';
          if (userProfile.available_equipment && userProfile.available_equipment.length > 0) {
            const equipmentNames = userProfile.available_equipment
              .map(eq => EQUIPMENT_DISPLAY_MAP[eq] || eq)
              .join(', ');
            equipment = equipmentNames;
          }
          
          welcomeMessage += `Based on your profile, I'll build you a ${frequency} plan for ${goal} using ${equipment}. Ready to generate your plan, or any questions first?`;
        } else {
          welcomeMessage += "Ready to create your personalized workout plan? Just say 'create my plan' or ask me any fitness questions first.";
        }

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
      // Clear the location state after loading (wrap in try-catch for SecurityError)
      try {
        window.history.replaceState({}, document.title);
      } catch (error) {
        // Silently fail if history API is not available (e.g., in iframe)
        console.warn('Could not replace history state:', error);
      }
      return;
    }

    // CRITICAL: Always refresh user profile when Chat page mounts
    // This ensures the AI has access to onboarding data even if the context
    // was initialized before the profile was saved
    refreshUserProfile();
    
    // Refresh workout plan context to catch any background-generated plans
    refreshWorkoutPlan(true);

    // Check for existing workout plans (free tier check)
    const checkExistingPlans = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: plans } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      setHasExistingPlan(plans && plans.length > 0);
      
      // Also log for debugging
      console.log('[Chat] Existing plans check:', plans?.length || 0, 'active plans found');
    };

    checkExistingPlans();

    // Check auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location, refreshUserProfile, refreshWorkoutPlan]);

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
      // ALWAYS fetch fresh profile from database before sending to AI
      // This ensures the AI always has the latest onboarding data
      const { data: { session } } = await supabase.auth.getSession();
      let profileToUse = null;
      
      if (session) {
        const { data: freshProfile, error: profileError } = await supabase
          .from('user_fitness_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        profileToUse = freshProfile;
        
        // Detailed logging to debug profile issues
        console.log('[Chat] Fresh profile fetch result:', {
          success: !!freshProfile,
          error: profileError?.message || null,
          fitness_goal: freshProfile?.fitness_goal || 'NOT SET',
          experience_level: freshProfile?.experience_level || 'NOT SET',
          available_equipment: freshProfile?.available_equipment || 'NOT SET',
          workout_frequency: freshProfile?.workout_frequency || 'NOT SET',
          limitations: freshProfile?.limitations || 'NOT SET'
        });
        
        if (profileError) {
          console.error('[Chat] Profile fetch error:', profileError);
        }
      } else {
        console.error('[Chat] No session found - cannot fetch profile');
      }
      
      // Check if this looks like a modification request
      const modificationKeywords = ['ease', 'easier', 'harder', 'intense', 'injury', 'hurt', 'pain', 
        'shorter', 'longer', 'less', 'more', 'reduce', 'increase', 'change', 'modify', 'adjust',
        'cardio', 'strength', 'rest', 'recovery', 'beginner', 'advanced'];
      const isModificationRequest = hasExistingPlan && 
        modificationKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
      
      // Check if user has already used their free modification
      const { data: currentProfile } = await supabase
        .from('user_fitness_profiles')
        .select('has_used_free_modification')
        .eq('user_id', session?.user?.id)
        .single();
      
      const hasUsedModification = currentProfile?.has_used_free_modification || false;
      
      if (isModificationRequest && hasUsedModification) {
        // User has already used their free modification - show upgrade modal
        setIsUpgradeModalOpen(true);
        setIsSending(false);
        return;
      }
      
      const systemPrompt = getFitnessCoachSystemPrompt(profileToUse, hasExistingPlan);
      console.log('[Chat] System prompt includes profile:', systemPrompt.includes('USER\'S FITNESS PROFILE'));
      console.log('[Chat] Has existing plan:', hasExistingPlan);
      console.log('[Chat] Is modification request:', isModificationRequest);
      
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
      
      // Check if AI confirmed a modification (contains "update your plan" or similar)
      const confirmationPhrases = ["update your plan", "updating your plan", "modify your plan", 
        "adjust your plan", "i'll update", "i'll modify", "i'll adjust", "changes made"];
      const isModificationConfirmation = isModificationRequest && 
        confirmationPhrases.some(phrase => aiResponse.toLowerCase().includes(phrase));
      
      if (isModificationConfirmation && workoutPlan) {
        console.log('[Chat] AI confirmed modification, calling modify-workout-plan edge function');
        
        // Call the modification edge function
        const { data: modResult, error: modError } = await supabase.functions.invoke('modify-workout-plan', {
          body: {
            userId: session?.user?.id,
            workoutPlanId: workoutPlan.id,
            modificationRequest: userMessage,
            userProfile: profileToUse
          }
        });
        
        if (modError) {
          console.error('[Chat] Modification error:', modError);
          toast({
            title: "Error",
            description: "Failed to modify your plan. Please try again.",
            variant: "destructive",
          });
        } else if (modResult?.success) {
          console.log('[Chat] Plan modified successfully:', modResult.summary);
          
          // Refresh the workout plan context
          await refreshWorkoutPlan(true);
          
          // Update the local state
          setHasUsedFreeModification(true);
          
          // Show success message
          toast({
            title: "Plan Updated! 🎉",
            description: modResult.summary || "Your workout plan has been modified.",
          });
          
          // Add a follow-up message from AI
          const followUpMsg = `Done! ${modResult.summary} Check your Workouts tab to see the updated plan.`;
          const { data: followUp } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: followUpMsg,
            })
            .select()
            .single();
          
          if (followUp) {
            setMessages(prev => [...prev, followUp as Message]);
            playReceiveSound();
          }
        }
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
                onClick={() => navigate("/workouts", { state: { refreshPlan: true } })}
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

    // Check if user already has an active workout plan
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: existingPlans } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      if (existingPlans && existingPlans.length > 0) {
        // User already has a plan - offer to view it instead of showing upgrade modal
        toast.info("You already have a workout plan! Redirecting to view it.", {
          action: {
            label: "View Plan",
            onClick: () => navigate("/workouts", { state: { refreshPlan: true } }),
          },
        });
        // Navigate after a short delay
        setTimeout(() => {
          navigate("/workouts", { state: { refreshPlan: true } });
        }, 1500);
        return;
      }
    } catch (error) {
      console.error('Error checking existing plans:', error);
    }

    const startTime = performance.now();
    console.log('[Chat] Starting workout plan generation...');
    setIsSending(true);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the edge function to generate workout plan
      const edgeStartTime = performance.now();
      const { data, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: { 
          conversationId,
          userId: session.user.id 
        }
      });

      if (error) throw error;

      console.log(`[Chat] Edge function completed in ${(performance.now() - edgeStartTime).toFixed(0)}ms`);

      if (data?.success) {
        console.log(`[Chat] Workout plan generated: ${data.workoutName}`);
        
        // Cache plan in context immediately for instant display
        const cacheStartTime = performance.now();
        const { data: cachedPlan } = await supabase
          .from('workout_plans')
          .select(`
            *,
            conversations(id),
            workout_days(
              *,
              workout_exercises(*)
            )
          `)
          .eq('id', data.workoutPlanId)
          .single();

        if (cachedPlan) {
          // Transform nested data structure
          const daysWithExercises = (cachedPlan.workout_days || [])
            .sort((a: any, b: any) => a.day_order - b.day_order)
            .map((day: any) => ({
              ...day,
              exercises: (day.workout_exercises || [])
                .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
            }));

          const planData = {
            id: cachedPlan.id,
            name: cachedPlan.name,
            description: cachedPlan.description,
            days: daysWithExercises,
            conversationId: cachedPlan.conversations?.[0]?.id
          };

          // Cache plan directly in context for instant display
          setWorkoutPlanDirectly(planData);
        }
        console.log(`[Chat] Plan cached in ${(performance.now() - cacheStartTime).toFixed(0)}ms`);
        
        // Reload messages to get the AI's response
        const messagesStartTime = performance.now();
        const { data: newMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (newMessages) {
          setMessages(newMessages as Message[]);
        }
        console.log(`[Chat] Messages reloaded in ${(performance.now() - messagesStartTime).toFixed(0)}ms`);

        setWorkoutPlanId(data.workoutPlanId);
        setHasExistingPlan(true);
        
        // Play receive sound
        playReceiveSound();

        // Show success banner to reveal navigation
        setShowSuccessBanner(true);

        const totalTime = performance.now() - startTime;
        console.log(`[Chat] ✅ Total plan generation time: ${totalTime.toFixed(0)}ms`);

        // Show success message with navigation button
        toast({
          title: "Your plan is ready! 💪",
          description: "Your workout plan is now available in the Workouts tab",
          action: (
            <Button 
              size="sm" 
              onClick={() => navigate("/workouts", { state: { refreshPlan: true } })}
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
      {/* New User Banner */}
      {!workoutPlan && !showSuccessBanner && (
        <div className="px-6 py-4 glass-card border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary shadow-glow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Let's build your workout plan</h2>
              <p className="text-xs text-muted-foreground">Chat with me to create your personalized plan</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner - shown after plan is created */}
      {showSuccessBanner && (
        <div className="px-6 py-4 glass-card border-b border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-energy shadow-glow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold tracking-tight">Plan created! 🎉</h2>
              <p className="text-xs text-muted-foreground">Check out your new workout plan below</p>
            </div>
          </div>
        </div>
      )}

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
          {/* Show welcome messages if no DB messages yet */}
          {messages.length === 0 && welcomeMessages.map((msg, index) => (
            <div
              key={msg.id}
              className="mb-4 flex justify-start animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="max-w-[75%] rounded-[24px] px-5 py-3.5 glass-card border-white/10 text-foreground shadow-premium relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-[24px] pointer-events-none"></div>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal relative z-10">
                  {msg.content}
                </p>
                <p className="text-[11px] mt-1 relative z-10 text-muted-foreground/60">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Show typing indicator during welcome sequence */}
          {showTypingIndicator && messages.length === 0 && (
            <TypingIndicator />
          )}

          {/* Regular messages from database */}
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

          {/* Typing indicator when AI is responding */}
          {isSending && (
            <TypingIndicator />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at Bottom Above Nav (or at very bottom if no nav) */}
      <div 
        className="fixed left-0 right-0 glass-strong border-t border-white/10 px-6 py-4 shadow-floating z-40"
        style={{ bottom: workoutPlan || showSuccessBanner ? 'calc(5rem + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={hasExistingPlan ? () => navigate("/workouts", { state: { refreshPlan: true } }) : handleGenerateWorkoutPlan}
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
            ) : hasExistingPlan ? (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                View My Workout Plan
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

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade to Pro"
        description={hasExistingPlan 
          ? "You already have an active workout plan. Delete it first or upgrade to Pro for unlimited workout plans and chat history."
          : "Free users can only have 1 workout plan and 1 chat. Upgrade to Pro for unlimited plans and conversations."
        }
      />

      <MobileTabBar />
    </div>
  );
};

export default Chat;