"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import {
  ApiClientError,
  isRequestCancelled,
} from "@/services/global/api-client";
import { askKuzaAI, type KuzaAILocale } from "@/services/intelligence/partner";
import type { KuzaAIMessage } from "@/types/intelligence/kuza-ai";

function createMessageId(role: KuzaAIMessage["role"]) {
  return `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

type UseKuzaAIConversationOptions = {
  businessId: string;
  locale: KuzaAILocale;
};

function useKuzaAIConversation({
  businessId,
  locale,
}: UseKuzaAIConversationOptions) {
  const { accessToken, clearSession, refreshAccessToken } = useIdentitySession();
  const [messages, setMessages] = useState<KuzaAIMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    requestController.current?.abort();
    requestController.current = null;
    setMessages([]);
    setError(null);
    setSending(false);
  }, [businessId]);

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || sending) return false;

      const userMessage: KuzaAIMessage = {
        content: message,
        id: createMessageId("user"),
        role: "user",
      };
      setMessages((current) => [...current, userMessage]);
      setError(null);
      setSending(true);

      const controller = new AbortController();
      requestController.current?.abort();
      requestController.current = controller;

      const runRequest = (token: string) =>
        askKuzaAI(businessId, token, message, locale, controller.signal);

      try {
        if (!accessToken) {
          throw new Error("An authenticated session is required.");
        }

        let response;
        try {
          response = await runRequest(accessToken);
        } catch (requestError) {
          if (
            !(requestError instanceof ApiClientError) ||
            requestError.details.kind !== "unauthenticated"
          ) {
            throw requestError;
          }

          try {
            response = await runRequest(await refreshAccessToken());
          } catch (refreshError) {
            if (
              refreshError instanceof ApiClientError &&
              refreshError.details.kind === "unauthenticated"
            ) {
              clearSession();
            }
            throw refreshError;
          }
        }

        if (!response.data) {
          throw new Error("Kuza AI response data is missing.");
        }

        setMessages((current) => [
          ...current,
          {
            content: response.data?.reply ?? "",
            id: createMessageId("assistant"),
            role: "assistant",
          },
        ]);
        return true;
      } catch (requestError) {
        if (!isRequestCancelled(requestError)) {
          setError(
            requestError instanceof Error
              ? requestError
              : new Error("Kuza AI request failed."),
          );
        }
        return false;
      } finally {
        if (requestController.current === controller) {
          requestController.current = null;
          setSending(false);
        }
      }
    },
    [
      accessToken,
      businessId,
      clearSession,
      locale,
      refreshAccessToken,
      sending,
    ],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    clearError,
    error,
    messages,
    sendMessage,
    sending,
  };
}

export { useKuzaAIConversation };
