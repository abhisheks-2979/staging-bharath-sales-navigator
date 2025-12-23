import { useState } from 'react';
import { MessageSquare, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ScenarioCardProps {
  scenario: {
    id: string;
    title: string;
    scenario_text: string;
    scenario_type: string;
    options: string[];
    best_option: string;
    feedback: Record<string, string>;
    difficulty_level: string;
    points: number;
  };
  onComplete: (selectedBest: boolean, points: number) => void;
}

export const ScenarioCard = ({ scenario, onComplete }: ScenarioCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsAnswered(true);
    const isBest = selectedOption === scenario.best_option;
    setTimeout(() => {
      onComplete(isBest, isBest ? scenario.points : Math.floor(scenario.points / 3));
    }, 2000);
  };

  const getScenarioTypeLabel = (type: string) => {
    switch (type) {
      case 'objection_handling': return 'Objection Handling';
      case 'closing': return 'Closing Technique';
      case 'relationship': return 'Relationship Building';
      default: return 'Sales Scenario';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {getScenarioTypeLabel(scenario.scenario_type)}
          </Badge>
          <Badge className="bg-amber-100 text-amber-800">
            +{scenario.points} pts
          </Badge>
        </div>
        <CardTitle className="text-base mt-2">{scenario.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Scenario Text */}
        <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
          <p className="text-sm italic text-muted-foreground">
            "{scenario.scenario_text}"
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <p className="text-sm font-medium">How would you respond?</p>
          {scenario.options.map((option, index) => {
            const isBest = option === scenario.best_option;
            const isSelected = selectedOption === option;
            
            return (
              <motion.button
                key={index}
                onClick={() => handleSelect(option)}
                disabled={isAnswered}
                className={cn(
                  "w-full text-left p-3 rounded-lg border text-sm transition-all",
                  !isAnswered && isSelected && "border-primary bg-primary/5",
                  !isAnswered && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/50",
                  isAnswered && isBest && "border-green-500 bg-green-50",
                  isAnswered && isSelected && !isBest && "border-orange-500 bg-orange-50",
                  isAnswered && !isSelected && !isBest && "opacity-50"
                )}
                whileTap={{ scale: isAnswered ? 1 : 0.98 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span>{option}</span>
                  <AnimatePresence>
                    {isAnswered && isBest && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-600 flex-shrink-0"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </motion.div>
                    )}
                    {isAnswered && isSelected && !isBest && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-orange-600 flex-shrink-0"
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
            disabled={!selectedOption}
            className="w-full"
          >
            Submit Response
          </Button>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {isAnswered && selectedOption && scenario.feedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={cn(
                "rounded-lg p-4 border",
                selectedOption === scenario.best_option 
                  ? "bg-green-50 border-green-200" 
                  : "bg-orange-50 border-orange-200"
              )}
            >
              <div className="flex gap-2">
                <Lightbulb className={cn(
                  "h-5 w-5 flex-shrink-0",
                  selectedOption === scenario.best_option ? "text-green-600" : "text-orange-600"
                )} />
                <div>
                  <p className="text-sm font-medium mb-1">
                    {selectedOption === scenario.best_option 
                      ? "Excellent choice! 🎉" 
                      : "Good try! Here's some feedback:"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scenario.feedback[`option${scenario.options.indexOf(selectedOption) + 1}`] || 
                     "Remember to always focus on the customer's needs and build trust."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
