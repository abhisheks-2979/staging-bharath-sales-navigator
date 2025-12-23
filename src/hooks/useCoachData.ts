import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserCoachStats {
  overall_learning_score: number;
  overall_competency_score: number;
  total_points_earned: number;
  total_content_completed: number;
  total_quizzes_attempted: number;
  total_correct_answers: number;
  total_scenarios_completed: number;
  current_streak: number;
  longest_streak: number;
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  score?: number;
}

export interface LearningContent {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration_minutes: number;
  difficulty_level: string;
  competency_id: string;
  points_on_completion: number;
  progress?: number;
  status?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  competency_id: string;
  difficulty_level: string;
  points: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  earned_at?: string;
}

export const useCoachData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user overall stats
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['coach-user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get or create user overall scores
      const { data: scores } = await supabase
        .from('coach_user_overall_scores')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Get user streak
      const { data: streak } = await supabase
        .from('coach_user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return {
        overall_learning_score: scores?.overall_learning_score || 0,
        overall_competency_score: scores?.overall_competency_score || 0,
        total_points_earned: scores?.total_points_earned || 0,
        total_content_completed: scores?.total_content_completed || 0,
        total_quizzes_attempted: scores?.total_quizzes_attempted || 0,
        total_correct_answers: scores?.total_correct_answers || 0,
        total_scenarios_completed: scores?.total_scenarios_completed || 0,
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
      } as UserCoachStats;
    },
    enabled: !!user?.id,
  });

  // Fetch competencies with user scores
  const { data: competencies, isLoading: isLoadingCompetencies } = useQuery({
    queryKey: ['coach-competencies', user?.id],
    queryFn: async () => {
      const { data: comps } = await supabase
        .from('coach_competencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (!user?.id || !comps) return comps || [];

      // Get user scores for each competency
      const { data: scores } = await supabase
        .from('coach_user_competency_scores')
        .select('*')
        .eq('user_id', user.id);

      const scoreMap = new Map(scores?.map(s => [s.competency_id, s.current_score]) || []);

      return comps.map(c => ({
        ...c,
        score: scoreMap.get(c.id) || 0
      })) as Competency[];
    },
    enabled: !!user?.id,
  });

  // Fetch learning content with progress
  const { data: learningContent, isLoading: isLoadingContent } = useQuery({
    queryKey: ['coach-learning-content', user?.id],
    queryFn: async () => {
      const { data: content } = await supabase
        .from('coach_learning_content')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!user?.id || !content) return content || [];

      // Get user progress
      const { data: progress } = await supabase
        .from('coach_user_progress')
        .select('*')
        .eq('user_id', user.id);

      const progressMap = new Map(progress?.map(p => [p.learning_content_id, p]) || []);

      return content.map(c => ({
        ...c,
        progress: progressMap.get(c.id)?.progress_percent || 0,
        status: progressMap.get(c.id)?.status || 'not_started'
      })) as LearningContent[];
    },
    enabled: !!user?.id,
  });

  // Fetch earned badges
  const { data: earnedBadges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['coach-earned-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data } = await supabase
        .from('coach_user_badges')
        .select(`
          *,
          badge:coach_badges(*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      return data?.map(d => ({
        ...d.badge,
        earned_at: d.earned_at
      })) as Badge[] || [];
    },
    enabled: !!user?.id,
  });

  // Get a random quiz question for today
  const { data: todaysQuiz } = useQuery({
    queryKey: ['coach-todays-quiz', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('coach_quiz_questions')
        .select('*')
        .eq('is_active', true)
        .limit(10);

      if (!data || data.length === 0) return null;

      // Pick a random question
      const randomIndex = Math.floor(Math.random() * data.length);
      const quiz = data[randomIndex];
      
      return {
        question: quiz.question,
        options: quiz.options as string[],
        correctAnswer: (quiz.options as string[]).indexOf(quiz.correct_answer),
        explanation: quiz.explanation
      };
    },
    enabled: !!user?.id,
  });

  // Get a learning tip
  const { data: learningTip } = useQuery({
    queryKey: ['coach-learning-tip'],
    queryFn: async () => {
      const tips = [
        {
          title: "The 80/20 Rule of Listening",
          content: "Top salespeople listen 80% and talk only 20% of the time. Ask questions, then truly listen to understand your customer's needs.",
          competency: "Relationship Building"
        },
        {
          title: "Beat Planning Strategy",
          content: "Plan your beat the night before. Prioritize high-value retailers and group nearby stores to minimize travel time.",
          competency: "Territory Planning"
        },
        {
          title: "Handle Objections with Questions",
          content: "When a customer objects, respond with a question. 'I understand your concern about the price. What would make this investment worthwhile for you?'",
          competency: "Objection Handling"
        }
      ];
      
      return tips[Math.floor(Math.random() * tips.length)];
    },
  });

  // Submit quiz answer mutation
  const submitQuizAnswer = useMutation({
    mutationFn: async ({ questionId, answer, isCorrect, points }: { 
      questionId: string; 
      answer: string; 
      isCorrect: boolean;
      points: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('coach_quiz_attempts')
        .insert({
          user_id: user.id,
          question_id: questionId,
          user_answer: answer,
          is_correct: isCorrect,
          points_earned: isCorrect ? points : 0
        });

      if (error) throw error;

      // Update streak if needed
      await updateUserStreak();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-user-stats'] });
    }
  });

  // Update learning progress
  const updateProgress = useMutation({
    mutationFn: async ({ contentId, progress, status }: {
      contentId: string;
      progress: number;
      status: 'in_progress' | 'completed';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('coach_user_progress')
        .upsert({
          user_id: user.id,
          learning_content_id: contentId,
          progress_percent: progress,
          status,
          started_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : null
        }, {
          onConflict: 'user_id,learning_content_id'
        });

      if (error) throw error;

      // Update streak
      await updateUserStreak();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-learning-content'] });
      queryClient.invalidateQueries({ queryKey: ['coach-user-stats'] });
    }
  });

  // Helper to update user streak
  const updateUserStreak = async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('coach_user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      const lastActivity = existing.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = existing.current_streak;
      
      if (lastActivity === today) {
        // Already updated today
        return;
      } else if (lastActivity === yesterdayStr) {
        // Consecutive day
        newStreak += 1;
      } else {
        // Streak broken
        newStreak = 1;
      }

      await supabase
        .from('coach_user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, existing.longest_streak),
          last_activity_date: today,
          total_learning_days: existing.total_learning_days + 1
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('coach_user_streaks')
        .insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
          total_learning_days: 1
        });
    }
  };

  return {
    userStats,
    competencies,
    learningContent,
    earnedBadges,
    todaysQuiz,
    learningTip,
    isLoading: isLoadingStats || isLoadingCompetencies || isLoadingContent || isLoadingBadges,
    submitQuizAnswer,
    updateProgress,
  };
};
