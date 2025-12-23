import { ArrowLeft, Flame, Trophy, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CoachDashboardHeaderProps {
  learningScore: number;
  competencyScore: number;
  currentStreak: number;
  totalPoints: number;
  userName?: string;
}

export const CoachDashboardHeader = ({
  learningScore,
  competencyScore,
  currentStreak,
  totalPoints,
  userName
}: CoachDashboardHeaderProps) => {
  const navigate = useNavigate();

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { label: 'Expert', color: 'text-emerald-300' };
    if (score >= 75) return { label: 'Advanced', color: 'text-blue-300' };
    if (score >= 60) return { label: 'Intermediate', color: 'text-amber-300' };
    if (score >= 40) return { label: 'Learning', color: 'text-orange-300' };
    return { label: 'Beginner', color: 'text-red-300' };
  };

  const grade = getScoreGrade(competencyScore);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      
      <div className="relative p-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span className="text-sm font-medium">AI Sales Coach</span>
          </div>
        </div>

        {/* Main Score Display */}
        <div className="text-center mb-6">
          <p className="text-white/80 text-sm mb-1">
            {userName ? `${userName}'s` : 'Your'} Competency Level
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="text-5xl font-bold">{competencyScore}</div>
            <div className="text-left">
              <div className={cn("text-lg font-semibold", grade.color)}>
                {grade.label}
              </div>
              <div className="text-xs text-white/60">out of 100</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-blue-300" />
            </div>
            <div className="text-xl font-bold">{learningScore}</div>
            <div className="text-xs text-white/70">Learning Score</div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <div className="text-xl font-bold">{currentStreak}</div>
            <div className="text-xs text-white/70">Day Streak</div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-4 w-4 text-amber-300" />
            </div>
            <div className="text-xl font-bold">{totalPoints}</div>
            <div className="text-xs text-white/70">Total Points</div>
          </div>
        </div>
      </div>
    </div>
  );
};
