"use client";

import { UserRound } from "lucide-react";

import { cn } from "@/lib/global/class-names";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";

type DashboardAvatarProps = {
  className?: string;
  size?: "large" | "small";
};

function getInitials(
  username: string | null,
  email: string | null,
  phoneNumber?: string | null,
) {
  const source =
    username?.trim() ||
    email?.split("@")[0] ||
    phoneNumber?.replace(/\D/g, "").slice(-4) ||
    "";
  const parts = source
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function DashboardAvatar({
  className,
  size = "small",
}: DashboardAvatarProps) {
  const { user } = useIdentitySession();
  const initials = user
    ? getInitials(user.username, user.email, user.phoneNumber)
    : "";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-brand-navy to-brand-orange",
        "font-semibold tracking-tight text-white shadow-sm",
        size === "large" ? "size-11 text-sm" : "size-9 text-xs",
        className,
      )}
    >
      {initials || <UserRound className="size-4" />}
    </span>
  );
}

export { DashboardAvatar };
