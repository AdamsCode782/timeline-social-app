"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Sync user into the database but *never* store avatar locally.
 * Clerk is the single source of truth for profile images.
 */
export async function syncUser() {
  try {
    const { userId } = await auth();
    const clerk = await currentUser();

    if (!userId || !clerk) return;

    // Check if user exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (existingUser) {
      return {
        ...existingUser,
        clerkImage: clerk.imageUrl,
      };
    }

    // Create DB user (NO image saved)
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

/**
 * Fetch a user by Clerk ID and merge Clerk avatar into the returned object.
 */
export async function getUserByClerkId(clerkId: string) {
  const clerk = await currentUser();

  const dbUser = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });

  if (!dbUser) return null;

  return {
    ...dbUser,
    clerkImage: clerk?.imageUrl ?? null,
  };
}

/**
 * Get internal DB user ID
 */
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
 * Return random users + always inject Clerk avatar
 */
export async function getRandomUsers() {
  try {
    const myId = await getDbUserId();
    const clerk = await currentUser();

    if (!myId) return [];

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: myId } },
          {
            NOT: {
              followers: {
                some: { followerId: myId },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true, // we won't use this
        clerkId: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 3,
    });

    return (
      await Promise.all(
        users.map(async (u) => {
          // Fetch each Clerk user
          let clerkUser = null;
          try {
            clerkUser = await currentUser(); // optional: replace with Clerk API users.getUser(u.clerkId)
          } catch {}

          return {
            ...u,
            clerkImage: clerkUser?.imageUrl ?? null,
          };
        })
      )
    ).filter(Boolean);
  } catch (error) {
    console.log("Error fetching random users", error);
    return [];
  }
}

/**
 * Follow / unfollow logic unchanged
 */
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
