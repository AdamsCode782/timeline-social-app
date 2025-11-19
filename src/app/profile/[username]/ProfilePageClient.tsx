"use client";

import { toggleFollow, deleteMyProfile } from "@/actions/user.action";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { updateProfile, getProfileByUsername } from "@/actions/profile.action";
import {
  CalendarIcon,
  EditIcon,
  FileTextIcon,
  HeartIcon,
  LinkIcon,
  MapPinIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useClerk } from "@clerk/nextjs";

type ClerkifiedUser = {
  id: string;
  name: string | null;
  username: string;
  clerkId: string;
  clerkImage: string;
};

type ClerkifiedComment = {
  id: string;
  authorId: string;
  postId: string;
  content: string;
  createdAt: Date;
  author: ClerkifiedUser;
};

type ClerkifiedPost = {
  id: string;
  authorId: string;
  content: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: ClerkifiedUser;
  comments: ClerkifiedComment[];
  likes: { userId: string }[];
  _count: { likes: number; comments: number };
};

type User = NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;


interface ProfilePageClientProps {
  isFollowing: boolean;
  likedPosts: ClerkifiedPost[];
  posts: ClerkifiedPost[];
  user: User & { clerkImage: string };
}

function ProfilePageClient({
  isFollowing: initialIsFollowing, 
  likedPosts,
  posts,
  user,
}: ProfilePageClientProps) {
  const { user: currentUser } = useUser();
  const router = useRouter();
  const { signOut } = useClerk();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    name: user.name || "",
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
  });

  const handleEditSubmit = async () => {
    const formData = new FormData();
    Object.entries(editForm).forEach(([k, v]) => formData.append(k, v));

    const res = await updateProfile(formData);
    if (res.success) {
      setShowEditDialog(false);
      toast.success("Profile updated");
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return;

    setIsUpdatingFollow(true);
    try {
      await toggleFollow(user.id);
      setIsFollowing((p) => !p);
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setIsUpdatingFollow(false);
    }
  };

  const isOwnProfile = currentUser?.id === user.clerkId;


  const handleDeleteProfile = async () => {
    setIsDeleting(true);

    const res = await deleteMyProfile();
    if (!res?.success) {
      toast.error("Failed to delete profile");
      setIsDeleting(false);
      return;
    }

    toast.success("Profile deleted");

    // Clerk logout
    await signOut()
  };

  const formattedDate = format(new Date(user.createdAt), "MMMM yyyy");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 gap-6">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-card rounded-xl border">
            <div className="pt-6 px-6 pb-4">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  src={user.clerkImage}
                  fallback="/avatar.png"
                  className="w-24 h-24"
                />

                <h1 className="mt-4 text-2xl font-bold">
                  {user.name ?? user.username}
                </h1>
                <p className="text-muted-foreground">@{user.username}</p>
                <p className="mt-2 text-sm">{user.bio}</p>

                {/* Stats */}
                <div className="w-full mt-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <div className="font-semibold">
                        {user._count.following}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Following
                      </div>
                    </div>

                    <Separator orientation="vertical" />

                    <div>
                      <div className="font-semibold">
                        {user._count.followers}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Followers
                      </div>
                    </div>

                    <Separator orientation="vertical" />

                    <div>
                      <div className="font-semibold">{user._count.posts}</div>
                      <div className="text-sm text-muted-foreground">
                        Posts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                {!currentUser ? (
                  <SignInButton mode="modal">
                    <Button className="w-full mt-4">Follow</Button>
                  </SignInButton>
                ) : isOwnProfile ? (
                  <>
                    <Button
                      className="w-full mt-4"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <EditIcon className="size-4 mr-2" /> Edit Profile
                    </Button>

                    <Button
                      variant="destructive"
                      className="w-full mt-4"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2Icon className="size-4 mr-2" /> Delete Profile
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full mt-4"
                    onClick={handleFollow}
                    disabled={isUpdatingFollow}
                    variant={isFollowing ? "outline" : "default"}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}

                {/* Profile details */}
                <div className="w-full mt-6 space-y-2 text-sm">
                  {user.location && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPinIcon className="size-4 mr-2" />
                      {user.location}
                    </div>
                  )}

                  {user.website && (
                    <div className="flex items-center text-muted-foreground">
                      <LinkIcon className="size-4 mr-2" />
                      <a
                        href={
                          user.website.startsWith("http")
                            ? user.website
                            : `https://${user.website}`
                        }
                        className="hover:underline"
                        target="_blank"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center text-muted-foreground">
                    <CalendarIcon className="size-4 mr-2" />
                    Joined {formattedDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* POSTS + LIKES */}
        <Tabs defaultValue="posts">
          <TabsList className="border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="posts" className="px-6 font-semibold">
              <FileTextIcon className="size-4" /> Posts
            </TabsTrigger>
            <TabsTrigger value="likes" className="px-6 font-semibold">
              <HeartIcon className="size-4" /> Likes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <div className="space-y-6">
              {posts.length ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} dbUserId={user.id} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No posts yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="likes" className="mt-6">
            <div className="space-y-6">
              {likedPosts.length ? (
                likedPosts.map((post) => (
                  <PostCard key={post.id} post={post} dbUserId={user.id} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No liked posts
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* DELETE PROFILE DIALOG */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Profile</DialogTitle>
              <DialogDescription>
                This will permanently delete your posts, comments, likes,
                followers, notifications and your profile. This cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-3 mt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>

              <Button
                variant="destructive"
                onClick={handleDeleteProfile}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Profile"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ProfilePageClient;
