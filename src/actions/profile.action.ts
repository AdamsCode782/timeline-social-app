"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { getDbUserId } from "./user.action";

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

  return user
    ? { ...user, clerkImage: clerk?.imageUrl ?? null }
    : null;
}

export async function getUserPosts(userId: string) {
  return prisma.post.findMany({
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
}

export async function getUserLikedPosts(userId: string) {
  return prisma.post.findMany({
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
}

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
