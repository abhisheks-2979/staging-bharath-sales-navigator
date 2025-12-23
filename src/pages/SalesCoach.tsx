import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layout } from '@/components/Layout';
import { useCoachData } from '@/hooks/useCoachData';
import { 
  CoachDashboardHeader, 
  CompetencyCard, 
  LearningPathCard,
  ScenarioCard 
} from '@/components/sales-coach';
import { 
  BookOpen, 
  Trophy, 
  Target, 
  Brain, 
  Loader2, 
  Award,
  TrendingUp,
  Sparkles,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const SalesCoach = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { 
    userStats, 
    competencies, 
    learningContent, 
    earnedBadges, 
    isLoading,
    updateProgress 
  } = useCoachData();

  const handleStartLearning = (contentId: string, title: string) => {
    toast({
      title: "Starting lesson",
      description: `Opening "${title}"...`,
    });
    updateProgress.mutate({
      contentId,
      progress: 10,
      status: 'in_progress'
    });
  };

  const handleContinueLearning = (contentId: string, title: string) => {
    toast({
      title: "Continuing lesson",
      description: `Resuming "${title}"...`,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading your learning dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const inProgressContent = learningContent?.filter(c => (c as any).status === 'in_progress') || [];
  const recommendedContent = learningContent?.filter(c => (c as any).status === 'not_started' || !(c as any).status).slice(0, 5) || [];
  const completedContent = learningContent?.filter(c => (c as any).status === 'completed') || [];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-20">
        {/* Header with Scores */}
        <CoachDashboardHeader
          learningScore={userStats?.overall_learning_score || 0}
          competencyScore={userStats?.overall_competency_score || 0}
          currentStreak={userStats?.current_streak || 0}
          totalPoints={userStats?.total_points_earned || 0}
        />

        {/* Main Content */}
        <div className="p-4 -mt-4 relative z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full bg-background shadow-sm">
              <TabsTrigger value="dashboard" className="text-xs">
                <Target className="h-4 w-4 mr-1 hidden sm:inline" />
                Home
              </TabsTrigger>
              <TabsTrigger value="learn" className="text-xs">
                <BookOpen className="h-4 w-4 mr-1 hidden sm:inline" />
                Learn
              </TabsTrigger>
              <TabsTrigger value="practice" className="text-xs">
                <Brain className="h-4 w-4 mr-1 hidden sm:inline" />
                Practice
              </TabsTrigger>
              <TabsTrigger value="achievements" className="text-xs">
                <Trophy className="h-4 w-4 mr-1 hidden sm:inline" />
                Badges
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6 mt-4">
              {/* Continue Learning */}
              {inProgressContent.length > 0 && (
                <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                      <Play className="h-5 w-5" />
                      Continue Learning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {inProgressContent.slice(0, 2).map(content => (
                      <LearningPathCard
                        key={content.id}
                        id={content.id}
                        title={content.title}
                        description={content.description}
                        contentType={content.content_type as any}
                        durationMinutes={content.duration_minutes}
                        difficultyLevel={content.difficulty_level as any}
                        pointsOnCompletion={content.points_on_completion}
                        progress={(content as any).progress || 0}
                        status={(content as any).status as any || 'not_started'}
                        onStart={() => handleStartLearning(content.id, content.title)}
                        onContinue={() => handleContinueLearning(content.id, content.title)}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Competency Overview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Your Competencies
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {competencies?.length || 0} areas
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {competencies?.map(comp => (
                    <CompetencyCard
                      key={comp.id}
                      name={comp.name}
                      description={comp.description}
                      icon={comp.icon || '📊'}
                      score={comp.score || 0}
                      category={comp.category}
                    />
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Learning Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {userStats?.total_content_completed || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Lessons Completed</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {userStats?.total_correct_answers || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Correct Answers</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {userStats?.total_quizzes_attempted || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {userStats?.total_scenarios_completed || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Scenarios Done</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Learn Tab */}
            <TabsContent value="learn" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Recommended for You</h2>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Picked
                </Badge>
              </div>

              {recommendedContent.length === 0 ? (
                <Card className="p-8 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold">All caught up!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've completed all available lessons. Check back soon for new content!
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {recommendedContent.map(content => (
                    <LearningPathCard
                      key={content.id}
                      id={content.id}
                      title={content.title}
                      description={content.description}
                      contentType={content.content_type as any}
                      durationMinutes={content.duration_minutes}
                      difficultyLevel={content.difficulty_level as any}
                      pointsOnCompletion={content.points_on_completion}
                      progress={(content as any).progress || 0}
                      status={(content as any).status as any || 'not_started'}
                      onStart={() => handleStartLearning(content.id, content.title)}
                      onContinue={() => handleContinueLearning(content.id, content.title)}
                    />
                  ))}
                </div>
              )}

              {completedContent.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    Completed ({completedContent.length})
                  </h3>
                  <div className="space-y-2">
                    {completedContent.slice(0, 3).map(content => (
                      <div key={content.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Award className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800">{content.title}</p>
                          <p className="text-xs text-green-600">+{content.points_on_completion} points earned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Practice Tab */}
            <TabsContent value="practice" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Practice Scenarios</h2>
                <Badge variant="secondary">Real-world cases</Badge>
              </div>

              <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <Brain className="h-12 w-12 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold text-purple-800">Sharpen Your Skills</h3>
                <p className="text-sm text-purple-600 mt-1 mb-4">
                  Practice with real sales scenarios and get instant feedback
                </p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Start Practice Session
                </Button>
              </Card>

              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Recent Scenarios</h3>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Complete some practice sessions to see your history here.
                </p>
              </div>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Your Badges</h2>
                <Badge variant="secondary">{earnedBadges?.length || 0} earned</Badge>
              </div>

              {earnedBadges && earnedBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {earnedBadges.map(badge => (
                    <Card key={badge.id} className="p-4 text-center bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <h4 className="font-semibold text-sm">{badge.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                      <p className="text-xs text-amber-600 mt-2">
                        Earned {new Date(badge.earned_at!).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold">Start Earning Badges!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete lessons and quizzes to earn your first badge.
                  </p>
                </Card>
              )}

              {/* Badge Goals */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Next Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl opacity-50">🏆</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Quiz Champion</p>
                      <p className="text-xs text-muted-foreground">Answer 50 quiz questions correctly</p>
                    </div>
                    <Badge variant="outline">0/50</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl opacity-50">🔥</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Consistent Learner</p>
                      <p className="text-xs text-muted-foreground">Maintain a 7-day learning streak</p>
                    </div>
                    <Badge variant="outline">{userStats?.current_streak || 0}/7</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default SalesCoach;
