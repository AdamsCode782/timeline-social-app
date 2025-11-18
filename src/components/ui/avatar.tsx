"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  fallback?: string;
  className?: string;
}

export function UserAvatar({ src, fallback, className }: UserAvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
    >
      <AvatarPrimitive.Image
        src={src ?? ""}
        className="aspect-square h-full w-full object-cover"
      />

      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center rounded-full bg-muted"
      >
        <img
          src={fallback ?? "/avatar.png"}
          className="h-full w-full object-cover rounded-full"
        />
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
