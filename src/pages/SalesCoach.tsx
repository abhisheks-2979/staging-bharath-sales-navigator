import { BookOpen, Play, CheckCircle, Star, ArrowLeft, Clock, Award, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";

const SalesCoach = () => {
  const navigate = useNavigate();

  const learningPaths = [
    {
      id: 1,
      title: "Sales Fundamentals",
      description: "Master the basics of effective selling",
      progress: 75,
      lessons: 8,
      completedLessons: 6,
      duration: "2h 30m",
      difficulty: "Beginner",
      badge: "🎯"
    },
    {
      id: 2,
      title: "Customer Relationship Management",
      description: "Build lasting relationships with clients",
      progress: 40,
      lessons: 10,
      completedLessons: 4,
      duration: "3h 15m",
      difficulty: "Intermediate",
      badge: "🤝"
    },
    {
      id: 3,
      title: "Negotiation Techniques",
      description: "Advanced negotiation strategies",
      progress: 0,
      lessons: 6,
      completedLessons: 0,
      duration: "2h",
      difficulty: "Advanced",
      badge: "💪"
    }
  ];

  const recentLessons = [
    { title: "Handling Customer Objections", type: "Video", duration: "12m", completed: true },
    { title: "Closing Techniques", type: "Interactive", duration: "15m", completed: true },
    { title: "Product Knowledge Quiz", type: "Assessment", duration: "8m", completed: false },
    { title: "Territory Planning", type: "Article", duration: "6m", completed: false },
  ];

  const achievements = [
    { title: "Fast Learner", description: "Completed 5 lessons this week", icon: "⚡" },
    { title: "Quiz Master", description: "100% score on assessments", icon: "🧠" },
    { title: "Consistent", description: "7-day learning streak", icon: "🔥" },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen size={28} />
                  Sales Coach
                </h1>
                <p className="text-primary-foreground/80 text-sm">Enhance your sales skills with personalized learning</p>
              </div>
            </div>

            {/* Learning Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">10</div>
                <div className="text-xs text-primary-foreground/80">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-primary-foreground/80">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">7</div>
                <div className="text-xs text-primary-foreground/80">Day Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          {/* Continue Learning */}
          <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Play size={20} />
                Continue Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">🎯</div>
                <div className="flex-1">
                  <p className="font-semibold">Sales Fundamentals</p>
                  <p className="text-sm text-muted-foreground">Lesson 7: Building Rapport</p>
                </div>
                <Button size="sm">
                  <Play size={14} className="mr-1" />
                  Resume
                </Button>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">75% complete</p>
            </CardContent>
          </Card>

          {/* Learning Paths */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Learning Paths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningPaths.map((path) => (
                  <div key={path.id} className="border border-muted rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{path.badge}</div>
                        <div>
                          <h3 className="font-semibold text-sm">{path.title}</h3>
                          <p className="text-xs text-muted-foreground">{path.description}</p>
                        </div>
                      </div>
                      <Badge className={getDifficultyColor(path.difficulty)} variant="secondary">
                        {path.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{path.completedLessons}/{path.lessons} lessons</span>
                      <span>{path.duration}</span>
                    </div>
                    
                    <Progress value={path.progress} className="h-2 mb-3" />
                    
                    <Button 
                      variant={path.progress > 0 ? "default" : "outline"} 
                      size="sm" 
                      className="w-full"
                    >
                      {path.progress > 0 ? "Continue" : "Start Learning"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Lessons */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Recent Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLessons.map((lesson, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      {lesson.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-muted-foreground rounded-full" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">{lesson.type} • {lesson.duration}</p>
                      </div>
                    </div>
                    {!lesson.completed && (
                      <Button variant="outline" size="sm">
                        Start
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={20} />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-lg border border-yellow-200">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <p className="font-semibold text-sm">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SalesCoach;