import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, MessageSquare, TrendingUp } from "lucide-react";

interface JointSalesSummaryCardProps {
  managerName: string;
  managerAvatar?: string;
  beatNames: string[];
  retailersVisited: number;
  feedbackCount: number;
  averageRating?: number;
}

export const JointSalesSummaryCard = ({
  managerName,
  managerAvatar,
  beatNames,
  retailersVisited,
  feedbackCount,
  averageRating,
}: JointSalesSummaryCardProps) => {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={managerAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {managerName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">Joint Sales with {managerName}</CardTitle>
            <p className="text-sm text-muted-foreground">Manager Collaboration</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Beats:</span>
          <div className="flex gap-1 flex-wrap">
            {beatNames.map((beat, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {beat}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Retailers Visited</p>
              <p className="text-lg font-bold">{retailersVisited}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <MessageSquare className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Feedback Captured</p>
              <p className="text-lg font-bold">{feedbackCount}</p>
            </div>
          </div>
        </div>

        {averageRating && averageRating > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-medium">Avg Rating:</span>
            <Badge variant="outline" className="text-green-600">
              {averageRating.toFixed(1)}/5.0
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
