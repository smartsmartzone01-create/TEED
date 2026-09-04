"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { IdentityFullPageLoader } from "@/components/identity/identity-full-page-loader";
import { usePathname } from "@/i18n/navigation";

type IdentityTransition = "authenticating" | "onboarding" | "registering";

type IdentityTransitionContextValue = {
  beginTransition: (transition: IdentityTransition) => void;
  endTransition: () => void;
  transition: IdentityTransition | null;
};

const IdentityTransitionContext = createContext<IdentityTransitionContextValue | null>(null);

type IdentityTransitionProviderProps = {
  children: ReactNode;
};

function IdentityTransitionProvider({ children }: IdentityTransitionProviderProps) {
  const loginT = useTranslations("Login");
  const onboardingT = useTranslations("Onboarding");
  const signupT = useTranslations("Signup");
  const pathname = usePathname();
  const startPathnameRef = useRef<string | null>(null);
  const [transition, setTransition] = useState<IdentityTransition | null>(null);

  const beginTransition = useCallback(
    (nextTransition: IdentityTransition) => {
      startPathnameRef.current = pathname;
      setTransition(nextTransition);
    },
    [pathname],
  );

  const endTransition = useCallback(() => {
    startPathnameRef.current = null;
    setTransition(null);
  }, []);

  useEffect(() => {
    if (
      transition &&
      startPathnameRef.current &&
      pathname !== startPathnameRef.current
    ) {
      startPathnameRef.current = null;
      setTransition(null);
    }
  }, [pathname, transition]);

  const value = useMemo(
    () => ({ beginTransition, endTransition, transition }),
    [beginTransition, endTransition, transition],
  );

  const message =
    transition === "authenticating"
      ? loginT("submitting")
      : transition === "registering"
        ? signupT("submitting")
        : transition === "onboarding"
          ? onboardingT("submitting")
          : null;

  return (
    <IdentityTransitionContext.Provider value={value}>
      {children}
      {message ? <IdentityFullPageLoader message={message} /> : null}
    </IdentityTransitionContext.Provider>
  );
}

function useIdentityTransition() {
  const context = useContext(IdentityTransitionContext);
  if (!context) {
    throw new Error(
      "useIdentityTransition must be used within IdentityTransitionProvider.",
    );
  }
  return context;
}

export { IdentityTransitionProvider, useIdentityTransition };
export type { IdentityTransition };
