"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { getDbUserId } from "./user.action";

/* -------------------------------------------------------
   FETCH PROFILE
------------------------------------------------------- */
export async function getProfileByUsername(username: string) {
  const clerk = await currentUser();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      image: true,
      location: true,
      website: true,
      createdAt: true,
      clerkId: true,
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });

  if (!user) return null;

  return {
    ...user,
    clerkImage: `https://img.clerk.com/${user.clerkId}`,
  };
}

/* -------------------------------------------------------
   USER POSTS (with clerkImage injected)
------------------------------------------------------- */
export async function getUserPosts(userId: string) {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    include: {
      author: { select: { id: true, name: true, username: true, clerkId: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, username: true, clerkId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((post) => ({
    ...post,
    author: {
      ...post.author,
      clerkImage: `https://img.clerk.com/${post.author.clerkId}`,
    },
    comments: post.comments.map((c) => ({
      ...c,
      author: {
        ...c.author,
        clerkImage: `https://img.clerk.com/${c.author.clerkId}`,
      },
    })),
  }));
}

/* -------------------------------------------------------
   LIKED POSTS (with clerkImage injected)
------------------------------------------------------- */
export async function getUserLikedPosts(userId: string) {
  const posts = await prisma.post.findMany({
    where: { likes: { some: { userId } } },
    include: {
      author: { select: { id: true, name: true, username: true, clerkId: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, username: true, clerkId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((post) => ({
    ...post,
    author: {
      ...post.author,
      clerkImage: `https://img.clerk.com/${post.author.clerkId}`,
    },
    comments: post.comments.map((c) => ({
      ...c,
      author: {
        ...c.author,
        clerkImage: `https://img.clerk.com/${c.author.clerkId}`,
      },
    })),
  }));
}

/* -------------------------------------------------------
   UPDATE PROFILE
------------------------------------------------------- */
export async function updateProfile(formData: FormData) {
  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const location = formData.get("location") as string;
  const website = formData.get("website") as string;

  const { userId: clerkId } = await import("@clerk/nextjs/server").then((m) =>
    m.auth()
  );

  if (!clerkId) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { clerkId },
    data: { name, bio, location, website },
  });

  return { success: true };
}

/* -------------------------------------------------------
   FOLLOW CHECK
------------------------------------------------------- */
export async function isFollowing(userId: string) {
  const currentUserId = await getDbUserId();
  if (!currentUserId) return false;

  const follow = await prisma.follows.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: userId,
      },
    },
  });

  return !!follow;
}
