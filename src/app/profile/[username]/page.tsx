import {
  getProfileByUsername,
  getUserLikedPosts,
  getUserPosts,
  isFollowing,
} from "@/actions/profile.action";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import ProfilePageClient from "./ProfilePageClient";

export async function generateMetadata({ params }) {
  const user = await getProfileByUsername(params.username);
  if (!user) return;

  return {
    title: `${user.name ?? user.username}`,
    description: user.bio || `Check out ${user.username}'s profile.`,
  };
}

async function ProfilePageServer({ params }) {
  const dbUser = await getProfileByUsername(params.username);
  if (!dbUser) notFound();

  const clerk = await currentUser();

  const clerkImage = clerk?.imageUrl ?? "/avatar.png";

  const [posts, likedPosts, isCurrentUserFollowing] = await Promise.all([
    getUserPosts(dbUser.id),
    getUserLikedPosts(dbUser.id),
    isFollowing(dbUser.id),
  ]);

  return (
    <ProfilePageClient
      user={{ ...dbUser, clerkImage }}
      posts={posts}
      likedPosts={likedPosts}
      isFollowing={isCurrentUserFollowing}
    />
  );
}

export default ProfilePageServer;
