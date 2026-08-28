"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";

type IdentityAccess = "dashboard" | "guest" | "onboarding";

type IdentityAccessBoundaryProps = {
  access: IdentityAccess;
  children: ReactNode;
};

function getRedirectTarget(
  access: IdentityAccess,
  authenticated: boolean,
  onboardingComplete: boolean,
) {
  if (access === "guest") {
    if (!authenticated) return null;
    return onboardingComplete ? "/home" : "/onboarding";
  }

  if (!authenticated) return "/login";

  if (access === "onboarding") {
    return onboardingComplete ? "/home" : null;
  }

  return onboardingComplete ? null : "/onboarding";
}

function IdentityAccessBoundary({
  access,
  children,
}: IdentityAccessBoundaryProps) {
  const common = useTranslations("IdentityCommon");
  const router = useRouter();
  const { status, user } = useIdentitySession();
  const redirectTarget =
    status === "initializing"
      ? null
      : getRedirectTarget(
          access,
          status === "authenticated",
          Boolean(user?.isOnboardingComplete),
        );

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (status === "initializing" || redirectTarget) {
    return (
      <div
        aria-live="polite"
        className="flex min-h-[50svh] items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {common(status === "initializing" ? "restoringSession" : "redirecting")}
      </div>
    );
  }

  return children;
}

export { IdentityAccessBoundary };
