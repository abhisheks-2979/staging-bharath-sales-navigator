import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './ChatMessage';
import { useChatCache } from '@/hooks/useChatCache';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  isCached?: boolean;
}

interface ChatDialogProps {
  onClose: () => void;
}

type LoadingState = 'idle' | 'connecting' | 'analyzing' | 'fetching' | 'generating';

const LOADING_MESSAGES: Record<LoadingState, string> = {
  idle: '',
  connecting: 'Connecting...',
  analyzing: 'Analyzing your question...',
  fetching: 'Fetching data...',
  generating: 'Generating response...'
};

const TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000; // 1 second, will exponentially increase

export const ChatDialog = ({ onClose }: ChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! 👋 I\'m your AI assistant for Bharath Beverages.\n\nI can help you with:\n• Today\'s visits & beat plans\n• Sales reports & analytics\n• Retailer information\n• Stock levels & inventory\n• Payment tracking\n\nTry asking: "my visits" or "sales summary"'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { getCachedResponse, cacheResponse, isCacheableQuery } = useChatCache();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Create conversation on first message
  const ensureConversation = async () => {
    if (conversationId) return conversationId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation'
      })
      .select()
      .single();

    if (error) throw error;
    setConversationId(data.id);
    return data.id;
  };

  // Save message to database
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const convId = await ensureConversation();
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: convId,
          role,
          content,
          metadata: {}
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithTimeout = async (
    url: string, 
    options: RequestInit, 
    timeout: number
  ): Promise<Response> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  };

  // Get current page context for the AI
  const getPageContext = useCallback(() => {
    const path = window.location.pathname;
    const pageMap: Record<string, string> = {
      '/': 'Home Dashboard',
      '/visits': 'My Visits',
      '/retailers': 'My Retailers',
      '/beats': 'Beat Planning',
      '/analytics': 'Analytics',
      '/order-entry': 'Order Entry',
      '/attendance': 'Attendance',
      '/schemes': 'Schemes',
    };
    return pageMap[path] || path;
  }, []);

  const sendMessageWithRetry = useCallback(async (
    userInput: string,
    recentMessages: Message[],
    session: any,
    attempt: number = 0
  ): Promise<string> => {
    try {
      setLoadingState(attempt > 0 ? 'connecting' : 'analyzing');
      
      const response = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: recentMessages.map(m => ({
              role: m.role,
              content: m.content
            })),
            conversationId,
            pageContext: getPageContext() // Send current page for context
          }),
        },
        TIMEOUT_MS
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        if (response.status === 402) {
          throw new Error('AI service credits exhausted. Please contact your administrator.');
        }
        throw new Error('Failed to get response from AI');
      }

      if (!response.body) throw new Error('No response body');

      setLoadingState('fetching');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            if (content) {
              if (!assistantContent) {
                setLoadingState('generating');
              }
              assistantContent += content;
              // Update the last message (assistant's response)
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Error parsing SSE:', e);
          }
        }
      }

      return assistantContent;

    } catch (error) {
      // Retry logic with exponential backoff
      if (attempt < MAX_RETRIES && error instanceof Error && 
          (error.message.includes('timed out') || error.message.includes('Failed to get response'))) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        setRetryCount(attempt + 1);
        await sleep(delay);
        return sendMessageWithRetry(userInput, recentMessages, session, attempt + 1);
      }
      throw error;
    }
  }, [conversationId]);

  const sendMessage = async (customInput?: string) => {
    const messageText = customInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLoadingState('connecting');
    setRetryCount(0);

    // Save user message
    await saveMessage('user', messageText);

    // Check cache first for common queries
    const cachedResponse = getCachedResponse(messageText);
    if (cachedResponse) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: cachedResponse,
        isCached: true 
      }]);
      setIsLoading(false);
      setLoadingState('idle');
      
      // Optionally refresh in background for next time
      refreshCacheInBackground(messageText, [...messages, userMessage]);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create placeholder for streaming response
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      // Limit message history to last 10 messages before sending
      const recentMessages = [...messages, userMessage].slice(-10);

      const assistantContent = await sendMessageWithRetry(messageText, recentMessages, session);

      // Save assistant message and cache response
      if (assistantContent) {
        await saveMessage('assistant', assistantContent);
        cacheResponse(messageText, assistantContent);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      
      // Remove the placeholder message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setLoadingState('idle');
      setRetryCount(0);
    }
  };

  // Refresh cache in background without blocking UI
  const refreshCacheInBackground = async (query: string, recentMessages: Message[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: recentMessages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            })),
            conversationId
          }),
        }
      );

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) content += delta;
          } catch {}
        }
      }

      if (content) {
        cacheResponse(query, content);
      }
    } catch (e) {
      // Silent fail for background refresh
    }
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove failed assistant message if present
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(lastUserMessage.content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
    sendMessage(query);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
        <div className="space-y-3 sm:space-y-4 max-w-full">
          {messages.map((message, index) => (
            <div key={index} className="relative">
              <ChatMessage message={message} />
              {message.isCached && (
                <span className="absolute top-0 right-0 flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  <Zap className="h-3 w-3" />
                  Instant
                </span>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {LOADING_MESSAGES[loadingState]}
                {retryCount > 0 && ` (Retry ${retryCount}/${MAX_RETRIES})`}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-3 sm:p-4 bg-background shrink-0">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('my visits')}
            disabled={isLoading}
            className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          >
            📍 My Visits
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('sales summary')}
            disabled={isLoading}
            className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          >
            💰 Sales
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('top retailers')}
            disabled={isLoading}
            className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          >
            ⭐ Retailers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('stock levels')}
            disabled={isLoading}
            className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          >
            📦 Stock
          </Button>
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            className="min-h-[50px] sm:min-h-[60px] resize-none text-sm"
            disabled={isLoading}
            rows={2}
          />
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[24px] w-[50px] sm:h-[29px] sm:w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {isLoading && (
              <Button
                onClick={handleRetry}
                variant="outline"
                size="icon"
                className="shrink-0 h-[24px] w-[50px] sm:h-[29px] sm:w-[60px]"
                title="Cancel and retry"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
