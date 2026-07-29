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
  refreshAccessToken: () => Promise<string>;
  status:
    | "authenticated"
    | "initializing"
    | "unauthenticated";
  updateUser: (user: IdentitySessionUser) => void;
  user: IdentitySessionUser | null;
};

const IdentitySessionContext =
  createContext<IdentitySessionContextValue | null>(null);

const SESSION_CHANNEL_NAME = "teed-identity-session";

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

  const resetSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setInitializing(false);
  }, []);

  const clearSession = useCallback(() => {
    resetSession();

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(
        SESSION_CHANNEL_NAME,
      );
      channel.postMessage({ type: "session-ended" });
      channel.close();
    }
  }, [resetSession]);

  const updateUser = useCallback(
    (nextUser: IdentitySessionUser) => {
      setUser(nextUser);
    },
    [],
  );

  const refreshAccessToken = useCallback(async () => {
    const response = await restoreSession();
    const data = response.data;

    if (!data) {
      throw new Error("Session refresh response data missing.");
    }

    establishSession({
      accessToken: data.tokens.access,
      user: {
        email: data.user.email,
        isOnboardingComplete:
          data.user.is_onboarding_complete,
        userId: data.user.id,
        username: data.user.username,
      },
    });

    return data.tokens.access;
  }, [establishSession]);

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

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(
      SESSION_CHANNEL_NAME,
    );

    channel.addEventListener("message", (event) => {
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        event.data.type === "session-ended"
      ) {
        resetSession();
      }
    });

    return () => {
      channel.close();
    };
  }, [resetSession]);

  const value = useMemo(
    () => ({
      accessToken,
      clearSession,
      establishSession,
      refreshAccessToken,
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
      refreshAccessToken,
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
