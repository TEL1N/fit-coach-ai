import { supabase } from "@/integrations/supabase/client";

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendClaudeMessage(
  messages: ClaudeMessage[],
  systemPrompt: string,
  maxTokens: number = 2048
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('chat-with-claude', {
      body: {
        messages,
        systemPrompt,
        maxTokens,
      },
    });

    if (error) {
      console.error('Error calling Claude function:', error);
      throw new Error('Failed to get AI response');
    }

    if (!data?.content) {
      throw new Error('No response from AI');
    }

    return data.content;
  } catch (error) {
    console.error('Error in sendClaudeMessage:', error);
    throw error;
  }
}