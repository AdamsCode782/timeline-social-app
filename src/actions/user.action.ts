"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Sync user into the database but *never* store avatar locally.
 */
export async function syncUser() {
  try {
    const { userId } = await auth();
    const clerk = await currentUser();

    if (!userId || !clerk) return;

    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (existingUser) {
      return {
        ...existingUser,
        clerkImage: clerk.imageUrl,
      };
    }

    const dbUser = await prisma.user.create({
      data: {
        clerkId: userId,
        name: `${clerk.firstName || ""} ${clerk.lastName || ""}`.trim(),
        username:
          clerk.username ??
          clerk.emailAddresses[0].emailAddress.split("@")[0],
        email: clerk.emailAddresses[0].emailAddress,
      },
    });

    return {
      ...dbUser,
      clerkImage: clerk.imageUrl,
    };
  } catch (error) {
    console.log("Error in syncUser", error);
  }
}

/** Get DB userId */
export async function getDbUserId() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!dbUser) throw new Error("User not found");
  return dbUser.id;
}

/**
 * Delete EVERYTHING for a user (posts, comments, likes, follows, notifications, user).
 * Cascading deletes are handled automatically by Prisma.
 */
export async function deleteMyProfile() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false };

  try {
    await prisma.user.delete({
      where: { clerkId },
    });

    // Revalidate home feed and profile pages
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting profile:", error);
    return { success: false };
  }
}
export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });
}

export async function getRandomUsers(limit = 5) {
  const users = await prisma.user.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });

  return users.map(u => ({
    ...u,
    clerkImage: u.image ?? "/avatar.png",
  }));
}



/** Follow/unfollow */
export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return;

    if (userId === targetUserId)
      throw new Error("You cannot follow yourself");

    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.follows.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        }),
        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId,
            creatorId: userId,
          },
        }),
      ]);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.log("Error in toggleFollow", error);
    return { success: false };
  }
}
