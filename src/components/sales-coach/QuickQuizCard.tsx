import { useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickQuizCardProps {
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  };
  onComplete: (correct: boolean) => void;
}

export const QuickQuizCard = ({ quiz, onComplete }: QuickQuizCardProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsAnswered(true);
    const isCorrect = selectedOption === quiz.correctAnswer;
    setTimeout(() => {
      onComplete(isCorrect);
    }, 1500);
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{quiz.question}</p>
      
      <div className="space-y-2">
        {quiz.options.map((option, index) => {
          const isCorrect = index === quiz.correctAnswer;
          const isSelected = selectedOption === index;
          
          return (
            <motion.button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isAnswered}
              className={cn(
                "w-full text-left p-3 rounded-lg border text-sm transition-all",
                !isAnswered && isSelected && "border-primary bg-primary/5",
                !isAnswered && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/50",
                isAnswered && isCorrect && "border-green-500 bg-green-50 text-green-800",
                isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-800",
                isAnswered && !isSelected && !isCorrect && "opacity-50"
              )}
              whileTap={{ scale: isAnswered ? 1 : 0.98 }}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                <AnimatePresence>
                  {isAnswered && isCorrect && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-600"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </motion.div>
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-red-600"
                    >
                      <XCircle className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>

      {!isAnswered && (
        <Button 
          onClick={handleSubmit} 
          disabled={selectedOption === null}
          className="w-full"
          size="sm"
        >
          Submit Answer
        </Button>
      )}

      <AnimatePresence>
        {isAnswered && quiz.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
          >
            <div className="flex gap-2 text-blue-800">
              <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{quiz.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
