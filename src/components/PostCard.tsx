"use client";

import { createComment, deletePost, toggleLike } from "@/actions/post.action";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { UserAvatar } from "./ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import { Button } from "./ui/button";
import { HeartIcon, LogInIcon, MessageCircleIcon, SendIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";

type Posts = Awaited<ReturnType<typeof import("@/actions/post.action").getPosts>>;
type Post = Posts[number];

function PostCard({ post, dbUserId }: { post: Post; dbUserId: string | null }) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLiked, setHasLiked] = useState(post.likes.some(l => l.userId === dbUserId));
  const [optimisticLikes, setLikes] = useState(post._count.likes);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    setHasLiked(p => !p);
    setLikes(p => p + (hasLiked ? -1 : 1));

    await toggleLike(post.id).catch(() => {
      setLikes(post._count.likes);
      setHasLiked(post.likes.some(l => l.userId === dbUserId));
    });

    setIsLiking(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isCommenting) return;
    setIsCommenting(true);

    const result = await createComment(post.id, newComment);

    if (result?.success) {
      toast.success("Comment posted");
      setNewComment("");
    } else toast.error("Failed");

    setIsCommenting(false);
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    const res = await deletePost(post.id);
    if (!res?.success) toast.error("Failed");
    else toast.success("Deleted");

    setIsDeleting(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">

          {/* HEADER */}
          <div className="flex space-x-3">
            <Link href={`/profile/${post.author.username}`}>
              <UserAvatar
                src={post.author.clerkImage}
                fallback="/avatar.png"
                className="h-10 w-10"
              />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 truncate">
                  <Link href={`/profile/${post.author.username}`} className="font-semibold truncate">
                    {post.author.name}
                  </Link>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Link href={`/profile/${post.author.username}`}>
                      @{post.author.username}
                    </Link>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                  </div>
                </div>

                {dbUserId === post.author.id && (
                  <DeleteAlertDialog isDeleting={isDeleting} onDelete={handleDeletePost} />
                )}
              </div>

              <p className="mt-2 text-sm break-words">{post.content}</p>
            </div>
          </div>

          {/* POST IMAGE */}
          {post.image && (
            <div className="rounded-lg overflow-hidden">
              <img src={post.image} className="w-full object-cover" />
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex items-center space-x-4 pt-2">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${hasLiked ? "text-red-500" : "text-muted-foreground"}`}
                onClick={handleLike}
              >
                <HeartIcon className="size-5" />
                <span>{optimisticLikes}</span>
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="gap-2">
                  <HeartIcon className="size-5" />
                  {optimisticLikes}
                </Button>
              </SignInButton>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(p => !p)}
              className="gap-2 text-muted-foreground"
            >
              <MessageCircleIcon className="size-5" />
              {post.comments.length}
            </Button>
          </div>

          {/* COMMENTS */}
          {showComments && (
            <div className="space-y-4 pt-4 border-t">
              {post.comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <UserAvatar
                    src={comment.author.clerkImage}
                    fallback="/avatar.png"
                    className="h-8 w-8"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-medium">{comment.author.name}</span>
                      <span className="text-muted-foreground">@{comment.author.username}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                      </span>
                    </div>

                    <p className="text-sm break-words">{comment.content}</p>
                  </div>
                </div>
              ))}

              {user ? (
                <div className="flex space-x-3">
                  <UserAvatar
                    src={user.imageUrl}
                    fallback="/avatar.png"
                    className="h-8 w-8"
                  />

                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />

                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isCommenting}
                      >
                        {isCommenting ? "Posting..." : (
                          <>
                            <SendIcon className="size-4" /> Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-4 border rounded-lg bg-muted/50">
                  <SignInButton mode="modal">
                    <Button variant="outline" className="gap-2">
                      <LogInIcon className="size-4" /> Sign in to comment
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}

export default PostCard;
