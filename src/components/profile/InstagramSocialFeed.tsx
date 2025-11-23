import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Image as ImageIcon, X, UserPlus, UserCheck, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface User {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
  is_following: boolean;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

export function InstagramSocialFeed() {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
    fetchPosts();
  }, []);

  const fetchUsers = async () => {
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id, full_name, profile_picture_url")
      .neq("id", user?.id)
      .order("full_name");

    if (allUsers) {
      const usersWithFollowStatus = await Promise.all(
        allUsers.map(async (u: any) => {
          const { data: followData } = await supabase
            .from("employee_connections")
            .select("id")
            .eq("follower_id", user?.id || "")
            .eq("following_id", u.id)
            .single();

          return {
            id: u.id,
            full_name: u.full_name,
            profile_picture_url: u.profile_picture_url,
            is_following: !!followData,
          };
        })
      );
      setUsers(usersWithFollowStatus);
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("social_posts")
      .select(`
        *,
        profiles!social_posts_user_id_fkey(full_name, profile_picture_url),
        social_likes(count),
        social_comments(count)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formattedPosts: Post[] = await Promise.all(
        data.map(async (post: any) => {
          const { data: likeData } = await supabase
            .from("social_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user?.id || "")
            .single();

          return {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            image_url: post.image_url,
            created_at: post.created_at,
            user_name: post.profiles?.full_name || "Unknown User",
            user_avatar: post.profiles?.profile_picture_url || null,
            likes_count: post.social_likes?.[0]?.count || 0,
            comments_count: post.social_comments?.[0]?.count || 0,
            has_liked: !!likeData,
          };
        })
      );
      setPosts(formattedPosts);
    }
  };

  const handleFollow = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      if (targetUser.is_following) {
        await supabase
          .from("employee_connections")
          .delete()
          .eq("follower_id", user?.id)
          .eq("following_id", userId);
        toast.success(`Unfollowed ${targetUser.full_name}`);
      } else {
        await supabase.from("employee_connections").insert({
          follower_id: user?.id,
          following_id: userId,
        });
        toast.success(`Now following ${targetUser.full_name}`);
      }
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedImage) return;

    setLoading(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("social-posts")
          .upload(fileName, selectedImage);

        if (error) throw error;
        imageUrl = data.path;
      }

      const { error } = await supabase.from("social_posts").insert({
        user_id: user?.id,
        content: newPost,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast.success("Post created successfully!");
      setNewPost("");
      setSelectedImage(null);
      setImagePreview(null);
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to create post: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.has_liked) {
        await supabase
          .from("social_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user?.id);
      } else {
        await supabase.from("social_likes").insert({
          post_id: postId,
          user_id: user?.id,
        });
      }
      fetchPosts();
    } catch (error) {
      toast.error("Failed to update like");
    }
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from("social_comments")
      .select(`
        *,
        profiles!social_comments_user_id_fkey(full_name, profile_picture_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const formattedComments: Comment[] = data.map((comment: any) => ({
        id: comment.id,
        user_id: comment.user_id,
        post_id: comment.post_id,
        content: comment.content,
        created_at: comment.created_at,
        user_name: comment.profiles?.full_name || "Unknown User",
        user_avatar: comment.profiles?.profile_picture_url || null,
      }));
      setComments((prev) => ({ ...prev, [postId]: formattedComments }));
    }
  };

  const toggleComments = (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
    } else {
      setExpandedComments(postId);
      fetchComments(postId);
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content) return;

    try {
      const { error } = await supabase.from("social_comments").insert({
        post_id: postId,
        user_id: user?.id,
        content,
      });

      if (error) throw error;

      setNewComment((prev) => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
      fetchPosts();
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  return (
    <div className="space-y-4">
      {/* Instagram-style Stories/Users Header */}
      <div className="bg-card border border-border rounded-lg p-3">
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-2">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src={u.profile_picture_url || ""} />
                      <AvatarFallback className="text-xs">{u.full_name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <Button
                    size="icon"
                    variant={u.is_following ? "secondary" : "default"}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
                    onClick={() => handleFollow(u.id)}
                  >
                    {u.is_following ? (
                      <UserCheck className="h-3 w-3" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <span className="text-xs text-center truncate w-full">
                  {u.full_name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Create Post - Instagram Style */}
      <Card className="border border-border">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.profile_picture_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-[#405DE6] to-[#5851DB] text-white">
                {userProfile?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[80px] resize-none border-0 focus-visible:ring-0 text-sm"
              />
            </div>
          </div>

          {imagePreview && (
            <div className="relative mb-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-lg max-h-[300px] object-cover"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <label htmlFor="post-image">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={() => document.getElementById("post-image")?.click()}
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                Photo
              </Button>
              <input
                id="post-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
            <Button
              onClick={handleCreatePost}
              disabled={loading || (!newPost.trim() && !selectedImage)}
              size="sm"
              className="bg-gradient-to-r from-[#405DE6] to-[#5851DB] hover:opacity-90"
            >
              <Send className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed - Instagram Style */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="border border-border overflow-hidden">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.user_avatar || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-[#405DE6] to-[#5851DB] text-white">
                    {post.user_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.user_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(post.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Post Image */}
            {post.image_url && (
              <div className="w-full">
                <img
                  src={`https://etabpbfokzhhfuybeieu.supabase.co/storage/v1/object/public/social-posts/${post.image_url}`}
                  alt="Post"
                  className="w-full object-cover max-h-[500px]"
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id)}
                  className={`p-0 h-auto hover:bg-transparent ${
                    post.has_liked ? "text-[#ED4956]" : ""
                  }`}
                >
                  <Heart
                    className={`h-6 w-6 ${post.has_liked ? "fill-current" : ""}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <MessageCircle className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <Send className="h-6 w-6" />
                </Button>
              </div>

              {/* Likes Count */}
              <p className="font-semibold text-sm">
                {post.likes_count} {post.likes_count === 1 ? "like" : "likes"}
              </p>

              {/* Post Content */}
              {post.content && (
                <p className="text-sm">
                  <span className="font-semibold mr-2">{post.user_name}</span>
                  {post.content}
                </p>
              )}

              {/* View Comments Link */}
              {post.comments_count > 0 && expandedComments !== post.id && (
                <button
                  onClick={() => toggleComments(post.id)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  View all {post.comments_count} comments
                </button>
              )}

              {/* Comments Section */}
              {expandedComments === post.id && (
                <div className="space-y-3 pt-2 border-t">
                  {comments[post.id]?.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={comment.user_avatar || ""} />
                        <AvatarFallback className="text-xs bg-muted">
                          {comment.user_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold mr-2">{comment.user_name}</span>
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(comment.created_at), "MMM d 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Add Comment */}
                  <div className="flex gap-2 items-center pt-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={userProfile?.profile_picture_url || ""} />
                      <AvatarFallback className="text-xs bg-muted">
                        {userProfile?.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment[post.id] || ""}
                      onChange={(e) =>
                        setNewComment((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment(post.id);
                        }
                      }}
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                    />
                    {newComment[post.id]?.trim() && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddComment(post.id)}
                        className="text-primary font-semibold p-0 h-auto hover:bg-transparent"
                      >
                        Post
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}