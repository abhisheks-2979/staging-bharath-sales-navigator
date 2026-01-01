import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Briefcase, GraduationCap, Trophy, UserPlus, UserCheck, 
  Calendar, Mail, Phone, Linkedin, Users, Building
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface TeamMemberProfileModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

interface MemberProfile {
  id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  phone_number: string | null;
  work_location: string | null;
  linkedin_url: string | null;
  interests: string[] | null;
  aspirations: string | null;
  date_of_birth: string | null;
  territories_covered: string[] | null;
}

interface EmployeeData {
  hq: string | null;
  education: string | null;
  date_of_joining: string | null;
  band: number | null;
}

export function TeamMemberProfileModal({ userId, open, onClose }: TeamMemberProfileModalProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchMemberData();
    }
  }, [open, userId]);

  const fetchMemberData = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const [
        profileResult,
        employeeResult,
        pointsResult,
        followingResult,
        followersResult,
        followingCountResult,
        postsResult
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, profile_picture_url, phone_number, work_location, linkedin_url, interests, aspirations, date_of_birth, territories_covered")
          .eq("id", userId)
          .single(),
        supabase
          .from("employees")
          .select("hq, education, date_of_joining, band")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("gamification_points")
          .select("points")
          .eq("user_id", userId),
        user ? supabase
          .from("employee_connections")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .maybeSingle() : Promise.resolve({ data: null }),
        supabase
          .from("employee_connections")
          .select("id", { count: "exact" })
          .eq("following_id", userId),
        supabase
          .from("employee_connections")
          .select("id", { count: "exact" })
          .eq("follower_id", userId),
        supabase
          .from("social_posts")
          .select("id", { count: "exact" })
          .eq("user_id", userId)
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }
      
      if (employeeResult.data) {
        setEmployeeData(employeeResult.data);
      }

      if (pointsResult.data) {
        const total = pointsResult.data.reduce((sum, record) => sum + (record.points || 0), 0);
        setTotalPoints(total);
      }

      setIsFollowing(!!followingResult.data);
      setFollowersCount(followersResult.count || 0);
      setFollowingCount(followingCountResult.count || 0);
      setPostsCount(postsResult.count || 0);
    } catch (error) {
      console.error("Error fetching member data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !userId) return;

    try {
      if (isFollowing) {
        await supabase
          .from("employee_connections")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success(`Unfollowed ${profile?.full_name}`);
      } else {
        await supabase.from("employee_connections").insert({
          follower_id: user.id,
          following_id: userId,
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(`Now following ${profile?.full_name}`);
      }
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  const isOwnProfile = user?.id === userId;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Team Member Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Header Section - LinkedIn Style */}
            <div className="flex flex-col items-center text-center space-y-3">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.profile_picture_url || ""} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="text-xl font-bold">{profile.full_name || "Team Member"}</h2>
                {employeeData?.hq && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {employeeData.hq}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-center">
                <div>
                  <p className="font-bold">{postsCount}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div>
                  <p className="font-bold">{followersCount}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="font-bold">{followingCount}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>

              {/* Follow Button */}
              {!isOwnProfile && (
                <Button 
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                  className="w-full"
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator />

            {/* Points Badge */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-2xl font-bold text-amber-600">{totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              {employeeData?.band && (
                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>Band {employeeData.band}</span>
                </div>
              )}

              {employeeData?.date_of_joining && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {format(new Date(employeeData.date_of_joining), "MMM yyyy")}</span>
                </div>
              )}

              {employeeData?.education && (
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="line-clamp-2">{employeeData.education}</span>
                </div>
              )}

              {profile.work_location && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.work_location}</span>
                </div>
              )}

              {profile.linkedin_url && (
                <a 
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn Profile</span>
                </a>
              )}
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Territories */}
            {profile.territories_covered && profile.territories_covered.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Territories Covered</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.territories_covered.map((territory, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {territory}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Aspirations */}
            {profile.aspirations && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Aspirations</p>
                  <p className="text-sm text-muted-foreground">{profile.aspirations}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Profile not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
