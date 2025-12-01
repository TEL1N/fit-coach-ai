import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileTabBar from "@/components/MobileTabBar";
import { Send, Sparkles, Zap } from "lucide-react";
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
      }

      // Check if response contains JSON workout plan
      if (aiResponse.includes('{') && aiResponse.includes('"workout_name"')) {
        toast({
          title: "Workout Plan Detected!",
          description: "I found a workout plan in the response. Ready to save it?",
        });
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
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">AI Coach</h1>
        <p className="text-sm text-muted-foreground">Your personal fitness assistant</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">AI Coach</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">
                {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
              </p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="mb-4 flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-6 py-4">
        <Button
          onClick={handleGenerateWorkoutPlan}
          disabled={isSending}
          className="w-full mb-3 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Zap className="w-5 h-5 mr-2" />
          Generate My Workout Plan
        </Button>
        
        <div className="flex gap-2">
          <Input
            placeholder="Message your AI coach..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="h-12 rounded-xl"
            disabled={isSending}
          />
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-xl flex-shrink-0"
            disabled={!message.trim() || isSending}
            onClick={handleSendMessage}
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