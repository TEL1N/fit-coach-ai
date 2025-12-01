import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus } from "lucide-react";

interface Conversation {
  id: string;
  created_at: string;
  workout_plan_id: string | null;
  workout_plan_name?: string;
}

interface ConversationSelectorProps {
  currentConversationId: string | null;
  onConversationChange: (conversationId: string | null) => void;
}

const ConversationSelector = ({ currentConversationId, onConversationChange }: ConversationSelectorProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        workout_plan_id,
        workout_plans (
          name
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedConversations = data.map(conv => ({
        id: conv.id,
        created_at: conv.created_at,
        workout_plan_id: conv.workout_plan_id,
        workout_plan_name: (conv.workout_plans as any)?.name,
      }));
      setConversations(formattedConversations);
    }
  };

  const formatConversationLabel = (conv: Conversation) => {
    const date = new Date(conv.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (conv.workout_plan_name) {
      return `${conv.workout_plan_name} - ${date}`;
    }
    return `Chat - ${date}`;
  };

  const handleValueChange = (value: string) => {
    if (value === "new") {
      onConversationChange(null);
    } else {
      onConversationChange(value);
    }
  };

  return (
    <div className="px-6 py-3 border-b border-border/30 bg-card/50 backdrop-blur-sm">
      <Select 
        value={currentConversationId || "new"} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="h-10 bg-muted/30 border-border/30 text-sm font-medium">
          <SelectValue placeholder="New Chat" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          <SelectItem value="new" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4" />
              <span>New Chat</span>
            </div>
          </SelectItem>
          {conversations.map((conv) => (
            <SelectItem 
              key={conv.id} 
              value={conv.id}
              className="cursor-pointer"
            >
              {formatConversationLabel(conv)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ConversationSelector;
