"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import {
  getStorefrontGoogleConfig,
  loginStorefrontCustomerWithGoogle,
} from "@/services/storefront-google-auth-client";
import type { StorefrontLocale } from "@/types/storefront";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "rectangular";
      locale: string;
      width: number;
    },
  ): void;
};

function googleIdentityApi(): GoogleIdentityApi | null {
  const googleWindow = window as typeof window & {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  };
  return googleWindow.google?.accounts?.id ?? null;
}

export function StorefrontGoogleSignIn({ locale }: { locale: StorefrontLocale }) {
  const isSwahili = locale === "sw";
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getStorefrontGoogleConfig()
      .then((config) => {
        if (active && config.enabled && config.client_id) {
          setClientId(config.client_id);
        }
      })
      .catch(() => {
        if (active) {
          setErrorMessage(
            isSwahili
              ? "Kuingia kwa Google hakupatikani kwa sasa."
              : "Google sign-in is unavailable right now.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isSwahili]);

  useEffect(() => {
    if (!clientId || !scriptReady || !buttonRef.current) {
      return;
    }
    const identity = googleIdentityApi();
    if (!identity) {
      return;
    }

    const measuredWidth = Math.floor(buttonRef.current.clientWidth || 320);
    buttonRef.current.replaceChildren();
    identity.initialize({
      client_id: clientId,
      callback: (response) => {
        if (!response.credential) {
          return;
        }
        setErrorMessage(null);
        void loginStorefrontCustomerWithGoogle(response.credential)
          .then(() => {
            window.location.replace("/");
          })
          .catch(() => {
            setErrorMessage(
              isSwahili
                ? "Hatukuweza kukuingiza kwa Google. Tafadhali jaribu tena."
                : "We could not sign you in with Google. Please try again.",
            );
          });
      },
    });
    identity.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      locale: isSwahili ? "sw" : "en",
      width: Math.min(Math.max(measuredWidth, 200), 400),
    });
  }, [clientId, isSwahili, scriptReady]);

  if (!clientId && !errorMessage) {
    return null;
  }

  return (
    <div className="storefront-google-auth">
      {clientId ? (
        <>
          <Script
            onError={() => {
              setErrorMessage(
                isSwahili
                  ? "Kuingia kwa Google hakupatikani kwa sasa."
                  : "Google sign-in is unavailable right now.",
              );
            }}
            onLoad={() => setScriptReady(true)}
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
          />
          <div className="storefront-google-auth-button" ref={buttonRef} />
        </>
      ) : null}
      {errorMessage ? (
        <p className="storefront-customer-auth-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
