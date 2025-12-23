import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Lightbulb, Brain, Target, Trophy, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { QuickQuizCard } from './QuickQuizCard';
import { LearningTipCard } from './LearningTipCard';
import { useCoachData } from '@/hooks/useCoachData';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  type: 'text' | 'quiz' | 'tip' | 'recommendation' | 'scenario';
  metadata?: any;
  timestamp: Date;
}

interface CoachChatInterfaceProps {
  onClose: () => void;
}

export const CoachChatInterface = ({ onClose }: CoachChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { userStats, todaysQuiz, learningTip, isLoading } = useCoachData();

  // Initial greeting
  useEffect(() => {
    const greeting = getGreeting();
    const initialMessages: Message[] = [
      {
        id: '1',
        role: 'coach',
        content: `${greeting}! I'm your AI Sales Coach. 🎓`,
        type: 'text',
        timestamp: new Date()
      },
      {
        id: '2',
        role: 'coach',
        content: userStats?.current_streak > 0 
          ? `Great job maintaining your ${userStats.current_streak}-day learning streak! 🔥` 
          : "Let's start building your learning streak today!",
        type: 'text',
        timestamp: new Date()
      }
    ];

    // Add a tip or quiz if available
    if (todaysQuiz) {
      initialMessages.push({
        id: '3',
        role: 'coach',
        content: "Here's a quick question to warm up your sales mind:",
        type: 'quiz',
        metadata: todaysQuiz,
        timestamp: new Date()
      });
    } else if (learningTip) {
      initialMessages.push({
        id: '3',
        role: 'coach',
        content: "Here's a tip for you today:",
        type: 'tip',
        metadata: learningTip,
        timestamp: new Date()
      });
    }

    setMessages(initialMessages);
  }, [userStats, todaysQuiz, learningTip]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      type: 'text',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (in production, this would call the AI endpoint)
    setTimeout(() => {
      const responses = getCoachResponse(inputValue.toLowerCase());
      setMessages(prev => [...prev, ...responses]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  }, [inputValue]);

  const getCoachResponse = (input: string): Message[] => {
    const responses: Message[] = [];
    const timestamp = new Date();

    if (input.includes('quiz') || input.includes('question')) {
      responses.push({
        id: Date.now().toString(),
        role: 'coach',
        content: "Here's a quiz to test your knowledge! 🧠",
        type: 'quiz',
        metadata: {
          question: "What's the most effective way to handle a price objection?",
          options: [
            "Immediately offer a discount",
            "Highlight unique value and ROI",
            "Ignore and change the subject",
            "Agree the price is high"
          ],
          correctAnswer: 1,
          explanation: "Focusing on value helps justify the price and builds trust with the customer."
        },
        timestamp
      });
    } else if (input.includes('tip') || input.includes('learn') || input.includes('help')) {
      responses.push({
        id: Date.now().toString(),
        role: 'coach',
        content: "Here's a valuable tip for you:",
        type: 'tip',
        metadata: {
          title: "The Power of Active Listening",
          content: "Great salespeople spend 60% of their time listening and only 40% talking. Ask open-ended questions and let your customer share their needs.",
          competency: "Relationship Building"
        },
        timestamp
      });
    } else if (input.includes('progress') || input.includes('score') || input.includes('how am i')) {
      const score = userStats?.overall_learning_score || 65;
      responses.push({
        id: Date.now().toString(),
        role: 'coach',
        content: `Your current learning score is ${score}/100! 📊\n\nYou've completed ${userStats?.total_content_completed || 0} lessons and answered ${userStats?.total_correct_answers || 0} questions correctly.\n\nKeep learning to improve your score!`,
        type: 'text',
        timestamp
      });
    } else {
      responses.push({
        id: Date.now().toString(),
        role: 'coach',
        content: "I'm here to help you become a better salesperson! Here's what I can do:\n\n• 🧠 **Quiz me** - Test your knowledge\n• 💡 **Give me a tip** - Learn something new\n• 📊 **My progress** - See your scores\n• 🎯 **Recommend learning** - Get personalized content",
        type: 'text',
        timestamp
      });
    }

    return responses;
  };

  const quickPrompts = [
    { icon: Brain, label: 'Quiz me', prompt: 'Give me a quiz question' },
    { icon: Lightbulb, label: 'Tips', prompt: 'Give me a learning tip' },
    { icon: Trophy, label: 'Progress', prompt: 'Show my progress' },
    { icon: Target, label: 'Learn', prompt: 'Recommend something to learn' },
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-muted/30 to-background">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl p-3",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border shadow-sm rounded-bl-sm'
                )}
              >
                {message.type === 'quiz' && message.metadata ? (
                  <QuickQuizCard 
                    quiz={message.metadata} 
                    onComplete={(correct) => {
                      setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'coach',
                        content: correct 
                          ? "Excellent! That's correct! 🎉 You earned 5 points!" 
                          : "Not quite, but that's how we learn! 📚",
                        type: 'text',
                        timestamp: new Date()
                      }]);
                    }}
                  />
                ) : message.type === 'tip' && message.metadata ? (
                  <LearningTipCard tip={message.metadata} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-card border shadow-sm rounded-2xl rounded-bl-sm p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t bg-background/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt.label}
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-1.5 rounded-full"
              onClick={() => handleQuickPrompt(prompt.prompt)}
            >
              <prompt.icon className="h-3.5 w-3.5" />
              {prompt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask your coach anything..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
