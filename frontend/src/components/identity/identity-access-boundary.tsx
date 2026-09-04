"use client";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { IdentityFullPageLoader } from "@/components/identity/identity-full-page-loader";
import { useRouter } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useIdentityTransition } from "@/providers/identity/identity-transition-provider";

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
  const { transition } = useIdentityTransition();
  const redirectTarget =
    status === "initializing" || transition
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
    return <IdentityFullPageLoader message={message} />;
  }

  return children;
}

export { IdentityAccessBoundary };
