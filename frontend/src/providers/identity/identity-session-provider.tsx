"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  status: "authenticated" | "unauthenticated";
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

  const establishSession = useCallback(
    ({
      accessToken: nextAccessToken,
      user: nextUser,
    }: EstablishSessionInput) => {
      setAccessToken(nextAccessToken);
      setUser(nextUser);
    },
    [],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (nextUser: IdentitySessionUser) => {
      setUser(nextUser);
    },
    [],
  );

  const value = useMemo(
    () => ({
      accessToken,
      clearSession,
      establishSession,
      status: user ? "authenticated" : "unauthenticated",
      updateUser,
      user,
    }) satisfies IdentitySessionContextValue,
    [
      accessToken,
      clearSession,
      establishSession,
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
