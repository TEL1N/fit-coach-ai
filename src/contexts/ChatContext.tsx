import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  // Load user profile and initial conversation on mount
  useEffect(() => {
    const initializeChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from('user_fitness_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
