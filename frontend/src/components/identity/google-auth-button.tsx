"use client";

import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { useRouter } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";
import { authenticateWithGoogle } from "@/services/identity/entry";
import type { GoogleCredentialResponse } from "@/types/identity/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

function GoogleAuthButton() {
  const locale = useLocale();
  const errorsT = useTranslations("IdentityErrors");
  const loginT = useTranslations("Login");
  const router = useRouter();
  const { notify } = useNotification();
  const { establishSession } = useIdentitySession();
  const { getErrorMessage } = useApiErrorMessages();
  const containerRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (isSubmitting || !response.credential) return;

      setIsSubmitting(true);
      try {
        const authResponse = await authenticateWithGoogle({
          credential: response.credential,
        });
        const data = authResponse.data;
        if (!data) throw new Error("Google authentication response data missing.");

        establishSession({
          accessToken: data.tokens.access,
          user: {
            countryCode: data.country_code ?? null,
            email: data.email,
            isOnboardingComplete: data.is_onboarding_complete,
            isPhoneVerified: data.is_phone_verified,
            phoneNumber: data.phone_number ?? null,
            suggestedUsername: data.suggested_username ?? null,
            userId: data.user_id,
            username: data.username,
          },
        });

        notify({ message: loginT("success"), tone: "success" });
        router.push(data.next_step === "dashboard" ? "/home" : "/onboarding");
      } catch (error) {
        if (error instanceof ApiClientError) {
          notify({ message: getErrorMessage(error.details), tone: "error" });
        } else {
          notify({ message: errorsT("unexpected_error"), tone: "error" });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      errorsT,
      establishSession,
      getErrorMessage,
      isSubmitting,
      loginT,
      notify,
      router,
    ],
  );

  useEffect(() => {
    const container = containerRef.current;
    const identityService = window.google?.accounts.id;
    if (!GOOGLE_CLIENT_ID || !googleReady || !container || !identityService) {
      return;
    }

    identityService.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        void handleCredential(response);
      },
    });

    container.replaceChildren();
    const measuredWidth = Math.floor(container.clientWidth || 320);
    identityService.renderButton(container, {
      locale: locale.startsWith("sw") ? "sw" : "en",
      logo_alignment: "left",
      shape: "rectangular",
      size: "large",
      text: "continue_with",
      theme: "outline",
      type: "standard",
      width: String(Math.min(Math.max(measuredWidth, 200), 400)),
    });
  }, [googleReady, handleCredential, locale]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script
        onReady={() => setGoogleReady(true)}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div
        aria-busy={isSubmitting}
        className={
          isSubmitting
            ? "mb-5 pointer-events-none opacity-60"
            : "mb-5"
        }
      >
        <div className="flex w-full justify-center" ref={containerRef} />
      </div>
    </>
  );
}

export { GoogleAuthButton };
