"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { restoreSession } from "@/services/identity/entry";

type IdentitySessionUser = {
  email: string;
  isOnboardingComplete: boolean;
  userId: string;
  username: string | null;
};

type EstablishSessionInput = {
  accessToken: string;
  user: IdentitySessionUser;
};

type IdentitySessionContextValue = {
  accessToken: string | null;
  clearSession: () => void;
  establishSession: (input: EstablishSessionInput) => void;
  status:
    | "authenticated"
    | "initializing"
    | "unauthenticated";
  updateUser: (user: IdentitySessionUser) => void;
  user: IdentitySessionUser | null;
};

const IdentitySessionContext =
  createContext<IdentitySessionContextValue | null>(null);

type IdentitySessionProviderProps = {
  children: ReactNode;
};

function IdentitySessionProvider({
  children,
}: IdentitySessionProviderProps) {
  const [accessToken, setAccessToken] = useState<
    string | null
  >(null);
  const [user, setUser] = useState<
    IdentitySessionUser | null
  >(null);
  const [initializing, setInitializing] = useState(true);

  const establishSession = useCallback(
    ({
      accessToken: nextAccessToken,
      user: nextUser,
    }: EstablishSessionInput) => {
      setAccessToken(nextAccessToken);
      setUser(nextUser);
      setInitializing(false);
    },
    [],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setInitializing(false);
  }, []);

  const updateUser = useCallback(
    (nextUser: IdentitySessionUser) => {
      setUser(nextUser);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((response) => {
        const data = response.data;

        if (!active || !data) {
          return;
        }

        setAccessToken(data.tokens.access);
        setUser({
          email: data.user.email,
          isOnboardingComplete:
            data.user.is_onboarding_complete,
          userId: data.user.id,
          username: data.user.username,
        });
      })
      .catch(() => {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setInitializing(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      clearSession,
      establishSession,
      status: initializing
        ? "initializing"
        : user
          ? "authenticated"
          : "unauthenticated",
      updateUser,
      user,
    }) satisfies IdentitySessionContextValue,
    [
      accessToken,
      clearSession,
      establishSession,
      initializing,
      updateUser,
      user,
    ],
  );

  return (
    <IdentitySessionContext.Provider value={value}>
      {children}
    </IdentitySessionContext.Provider>
  );
}

function useIdentitySession() {
  const context = useContext(IdentitySessionContext);

  if (!context) {
    throw new Error(
      "useIdentitySession must be used within IdentitySessionProvider.",
    );
  }

  return context;
}

export {
  IdentitySessionProvider,
  useIdentitySession,
};
export type { IdentitySessionUser };
