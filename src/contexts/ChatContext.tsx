import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  created_at: string;
  workout_plan_id: string | null;
}

interface ChatContextType {
  messages: Message[];
  conversationId: string | null;
  workoutPlanId: string | null;
  userProfile: any;
  isLoading: boolean;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setConversationId: (id: string | null) => void;
  setWorkoutPlanId: (id: string | null) => void;
  loadConversation: (convId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [workoutPlanId, setWorkoutPlanId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const loadConversation = async (convId: string) => {
    setIsLoading(true);
    
    const { data: conv } = await supabase
      .from('conversations')
      .select('workout_plan_id')
      .eq('id', convId)
      .single();
    
    if (conv) {
      setWorkoutPlanId(conv.workout_plan_id);
    }

    const { data: existingMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    setMessages((existingMessages as Message[]) || []);
    setConversationId(convId);
    setIsLoading(false);
  };

  const refreshConversations = async () => {
    // Reload current conversation if one is active
    if (conversationId) {
      await loadConversation(conversationId);
    }
  };

  // Refresh user profile - useful when navigating back to chat after profile changes
  const refreshUserProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: profile } = await supabase
      .from('user_fitness_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    console.log('[ChatContext] Refreshed user profile:', profile);
    setUserProfile(profile);
  }, []);

  // Load user profile and initial conversation on mount
  useEffect(() => {
    const initializeChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Load user profile FIRST - this is critical for AI to know user's onboarding info
      const { data: profile, error: profileError } = await supabase
        .from('user_fitness_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      // Detailed logging for debugging profile issues
      if (profileError) {
        console.error('[ChatContext] ❌ PROFILE FETCH FAILED:', profileError.message);
        console.error('[ChatContext] This means the AI will NOT have access to onboarding data!');
      } else if (profile) {
        console.log('[ChatContext] ✅ Profile loaded successfully:', {
          fitness_goal: profile.fitness_goal,
          experience_level: profile.experience_level,
          available_equipment: profile.available_equipment,
          workout_frequency: profile.workout_frequency,
          limitations: profile.limitations || 'None'
        });
      } else {
        console.warn('[ChatContext] ⚠️ No profile found for user - onboarding may not be complete');
      }
      
      setUserProfile(profile);

      // Load or create most recent conversation
      let { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      let convId: string;

      if (!conversations || conversations.length === 0) {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ user_id: session.user.id })
          .select()
          .single();

        if (!newConv) {
          setIsLoading(false);
          return;
        }

        convId = newConv.id;
        
        // Don't insert welcome messages here - Chat.tsx handles the animated welcome sequence
        // Messages will be empty initially, triggering the welcome animation in Chat.tsx
        setMessages([]);
      } else {
        convId = conversations[0].id;
        
        // Load workout_plan_id if linked
        const { data: conv } = await supabase
          .from('conversations')
          .select('workout_plan_id')
          .eq('id', convId)
          .single();
        
        if (conv) {
          setWorkoutPlanId(conv.workout_plan_id);
        }

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
      setHasFetchedOnce(true);
    };

    initializeChat();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      initializeChat();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversationId,
        workoutPlanId,
        userProfile,
        isLoading: isLoading && !hasFetchedOnce,
        setMessages,
        setConversationId,
        setWorkoutPlanId,
        loadConversation,
        refreshConversations,
        refreshUserProfile,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
