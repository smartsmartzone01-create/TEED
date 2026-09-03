"use client";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { BrandLoader } from "@/components/global/brand/brand-loader";
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
    const message = common(
      status === "initializing" ? "restoringSession" : "redirecting",
    );

    return (
      <div className="fixed inset-0 z-[100] flex min-h-svh items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <BrandLoader label={message} />
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export { IdentityAccessBoundary };
