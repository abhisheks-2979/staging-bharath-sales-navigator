import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Heart, MessageCircle, Send, Image as ImageIcon, X, UserPlus, UserCheck, 
  MoreHorizontal, Smile, Paperclip, Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface User {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
  is_following: boolean;
}

interface PostAttachment {
  id: string;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
}

interface Reaction {
  emoji: string;
  count: number;
  has_reacted: boolean;
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
  attachments: PostAttachment[];
  reactions: Record<string, Reaction>;
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

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

export function InstagramSocialFeed() {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
    fetchFollowingList();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchFollowingList = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("employee_connections")
      .select("following_id")
      .eq("follower_id", user.id);

    if (data) {
      setFollowingIds(data.map((d: any) => d.following_id));
    }
  };

  const fetchUsers = async () => {
    if (!user) return;
    
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id, full_name, profile_picture_url")
      .neq("id", user.id)
      .order("full_name");

    if (allUsers) {
      const usersWithFollowStatus = await Promise.all(
        allUsers.map(async (u: any) => {
          const { data: followData } = await supabase
            .from("employee_connections")
            .select("id")
            .eq("follower_id", user.id)
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
    if (!user) return;

    // Get all posts - visible to all team members
    const { data, error } = await supabase
      .from("social_posts")
      .select(`
        *,
        profiles!social_posts_user_id_fkey(full_name, profile_picture_url),
        social_likes(count),
        social_comments(count),
        social_post_attachments(id, file_url, file_type, file_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const formattedPosts: Post[] = await Promise.all(
        data.map(async (post: any) => {
          // Check if current user liked
          const { data: likeData } = await supabase
            .from("social_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .single();

          // Fetch reactions for this post
          const { data: reactionsData } = await supabase
            .from("social_reactions")
            .select("emoji, user_id")
            .eq("post_id", post.id);

          const reactions: Record<string, Reaction> = {};
          if (reactionsData) {
            reactionsData.forEach((r: any) => {
              if (!reactions[r.emoji]) {
                reactions[r.emoji] = { emoji: r.emoji, count: 0, has_reacted: false };
              }
              reactions[r.emoji].count++;
              if (r.user_id === user.id) {
                reactions[r.emoji].has_reacted = true;
              }
            });
          }

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
            attachments: post.social_post_attachments || [],
            reactions,
          };
        })
      );
      setPosts(formattedPosts);
    }
  };

  const handleFollow = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !user) return;

    try {
      if (targetUser.is_following) {
        await supabase
          .from("employee_connections")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
        toast.success(`Unfollowed ${targetUser.full_name}`);
      } else {
        await supabase.from("employee_connections").insert({
          follower_id: user.id,
          following_id: userId,
        });
        toast.success(`Now following ${targetUser.full_name}`);
      }
      fetchUsers();
      fetchFollowingList();
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...selectedImages, ...files].slice(0, 10); // Max 10 images
    setSelectedImages(newFiles);

    // Generate previews
    newFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => {
          const updated = [...prev];
          updated[index] = reader.result as string;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && selectedImages.length === 0 && selectedFiles.length === 0) return;
    if (!user) return;

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload first image as main image (legacy support)
      if (selectedImages.length > 0) {
        const file = selectedImages[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("social-posts")
          .upload(fileName, file);

        if (error) throw error;
        imageUrl = data.path;
      }

      // Create post
      const { data: postData, error: postError } = await supabase
        .from("social_posts")
        .insert({
          user_id: user.id,
          content: newPost,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload additional images as attachments
      for (let i = 1; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("social-posts")
          .upload(fileName, file);

        if (!uploadError && uploadData) {
          await supabase.from("social_post_attachments").insert({
            post_id: postData.id,
            file_url: uploadData.path,
            file_type: file.type,
            file_name: file.name,
          });
        }
      }

      // Upload files as attachments
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/files/${Date.now()}_${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("social-posts")
          .upload(fileName, file);

        if (!uploadError && uploadData) {
          await supabase.from("social_post_attachments").insert({
            post_id: postData.id,
            file_url: uploadData.path,
            file_type: file.type,
            file_name: file.name,
          });
        }
      }

      toast.success("Post created successfully!");
      setNewPost("");
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedFiles([]);
      fetchPosts();
    } catch (error: any) {
      toast.error("Failed to create post: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.has_liked) {
        await supabase
          .from("social_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("social_likes").insert({
          post_id: postId,
          user_id: user.id,
        });
      }
      fetchPosts();
    } catch (error) {
      toast.error("Failed to update like");
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!user) return;
    
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      const hasReacted = post.reactions[emoji]?.has_reacted;
      
      if (hasReacted) {
        await supabase
          .from("social_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase.from("social_reactions").insert({
          post_id: postId,
          user_id: user.id,
          emoji,
        });
      }
      fetchPosts();
    } catch (error) {
      toast.error("Failed to add reaction");
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
    if (!user) return;
    const content = newComment[postId]?.trim();
    if (!content) return;

    try {
      const { error } = await supabase.from("social_comments").insert({
        post_id: postId,
        user_id: user.id,
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

  const getStorageUrl = (path: string) => {
    return `https://etabpbfokzhhfuybeieu.supabase.co/storage/v1/object/public/social-posts/${path}`;
  };

  return (
    <div className="space-y-4">
      {/* Users to Follow Header */}
      <div className="bg-card border border-border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-2 px-1">People you may know</p>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-2">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className="relative">
                  <div className={`w-14 h-14 rounded-full p-[2px] ${
                    u.is_following 
                      ? "bg-muted" 
                      : "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                  }`}>
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src={u.profile_picture_url || ""} />
                      <AvatarFallback className="text-xs">{u.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                  </div>
                  <Button
                    size="icon"
                    variant={u.is_following ? "secondary" : "default"}
                    className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full"
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
                  {u.full_name?.split(" ")[0] || "User"}
                </span>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Create Post */}
      <Card className="border border-border">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={userProfile?.profile_picture_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userProfile?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* File Previews */}
          {selectedFiles.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 p-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Photo
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                File
              </Button>
            </div>
            
            <Button
              onClick={handleCreatePost}
              disabled={loading || (!newPost.trim() && selectedImages.length === 0 && selectedFiles.length === 0)}
              size="sm"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share something with the team!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="border border-border overflow-hidden">
              {/* Post Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.user_avatar || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {post.user_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{post.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Post Content */}
              {post.content && (
                <div className="px-3 pb-3">
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                </div>
              )}

              {/* Post Image */}
              {post.image_url && (
                <div className="w-full">
                  <img
                    src={getStorageUrl(post.image_url)}
                    alt="Post"
                    className="w-full object-cover max-h-[500px]"
                  />
                </div>
              )}

              {/* Additional Attachments */}
              {post.attachments.length > 0 && (
                <div className="px-3 py-2 flex gap-2 flex-wrap">
                  {post.attachments.map((att) => (
                    att.file_type?.startsWith("image/") ? (
                      <img
                        key={att.id}
                        src={getStorageUrl(att.file_url)}
                        alt={att.file_name || "Attachment"}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <a
                        key={att.id}
                        href={getStorageUrl(att.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-xs hover:bg-muted/80"
                      >
                        <Paperclip className="h-3 w-3" />
                        {att.file_name || "File"}
                      </a>
                    )
                  ))}
                </div>
              )}

              {/* Reactions Display */}
              {Object.keys(post.reactions).length > 0 && (
                <div className="px-3 py-2 flex gap-2 flex-wrap">
                  {Object.entries(post.reactions).map(([emoji, reaction]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        reaction.has_reacted 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{reaction.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Post Actions */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className={`p-0 h-auto hover:bg-transparent ${
                      post.has_liked ? "text-red-500" : ""
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${post.has_liked ? "fill-current" : ""}`}
                    />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(post.id)}
                    className="p-0 h-auto hover:bg-transparent"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto hover:bg-transparent"
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="flex gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(post.id, emoji)}
                            className="text-lg hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Likes Count */}
                <p className="font-semibold text-sm mt-2">
                  {post.likes_count} {post.likes_count === 1 ? "like" : "likes"}
                </p>

                {/* View Comments Link */}
                {post.comments_count > 0 && expandedComments !== post.id && (
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="text-sm text-muted-foreground hover:text-foreground mt-1"
                  >
                    View all {post.comments_count} comments
                  </button>
                )}

                {/* Comments Section */}
                {expandedComments === post.id && (
                  <div className="space-y-3 pt-3 mt-3 border-t">
                    {comments[post.id]?.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={comment.user_avatar || ""} />
                          <AvatarFallback className="text-xs bg-muted">
                            {comment.user_name?.[0] || "?"}
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
                  </div>
                )}

                {/* Add Comment - Always visible */}
                <div className="flex gap-2 pt-3 mt-3 border-t">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={userProfile?.profile_picture_url || ""} />
                    <AvatarFallback className="text-xs bg-muted">
                      {userProfile?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment[post.id] || ""}
                      onChange={(e) =>
                        setNewComment((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment(post.id);
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleAddComment(post.id)}
                      disabled={!newComment[post.id]?.trim()}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
