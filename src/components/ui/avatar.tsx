"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  src,
  fallback,
  className,
}: {
  src?: string | null;
  fallback?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    >
      <AvatarPrimitive.Image
        src={src || fallback || "/avatar.png"}
        className="aspect-square h-full w-full"
      />
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-muted">
        ?
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
