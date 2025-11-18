"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function createPost(content: string, image: string) {
  const userId = await getDbUserId();
  if (!userId) return;

  const post = await prisma.post.create({
    data: { content, image, authorId: userId },
  });

  revalidatePath("/");
  return { success: true, post };
}

export async function getPosts() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          clerkId: true,
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              clerkId: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
    },
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

export async function toggleLike(postId: string) {
  const userId = await getDbUserId();
  if (!userId) return;

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) throw new Error("Post not found");

  if (existing) {
    await prisma.like.delete({
      where: { userId_postId: { userId, postId } },
    });
  } else {
    await prisma.$transaction([
      prisma.like.create({ data: { userId, postId } }),
      ...(post.authorId !== userId
        ? [
            prisma.notification.create({
              data: {
                type: "LIKE",
                creatorId: userId,
                userId: post.authorId,
                postId,
              },
            }),
          ]
        : []),
    ]);
  }

  revalidatePath("/");
  return { success: true };
}

export async function createComment(postId: string, content: string) {
  const userId = await getDbUserId();
  if (!userId || !content) return;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) throw new Error("Post not found");

  const [comment] = await prisma.$transaction(async (tx) => {
    const newComment = await tx.comment.create({
      data: { content, authorId: userId, postId },
    });

    if (post.authorId !== userId) {
      await tx.notification.create({
        data: {
          type: "COMMENT",
          creatorId: userId,
          userId: post.authorId,
          postId,
          commentId: newComment.id,
        },
      });
    }

    return [newComment];
  });

  revalidatePath("/");
  return { success: true, comment };
}

export async function deletePost(postId: string) {
  const userId = await getDbUserId();
  if (!userId) return;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) throw new Error("Post not found");
  if (post.authorId !== userId) throw new Error("Unauthorized");

  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/");
  return { success: true };
}
