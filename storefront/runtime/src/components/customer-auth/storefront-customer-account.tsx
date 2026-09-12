"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  getCurrentStorefrontCustomer,
  loginStorefrontCustomer,
  logoutStorefrontCustomer,
  registerStorefrontCustomer,
  StorefrontCustomerRequestError,
  verifyStorefrontCustomer,
  type StorefrontCustomerChannel,
} from "@/services/storefront-customer-auth-client";
import type { StorefrontLocale } from "@/types/storefront";
import type { StorefrontCustomerProfile } from "@/types/storefront-customer-auth";

type AuthMode = "signin" | "register";

type PendingVerification = {
  channel: StorefrontCustomerChannel;
  email?: string;
  countryCode?: string;
  phoneNumber?: string;
};

const COUNTRIES = [
  { code: "TZ", en: "Tanzania", sw: "Tanzania" },
  { code: "KE", en: "Kenya", sw: "Kenya" },
  { code: "UG", en: "Uganda", sw: "Uganda" },
] as const;

function customerDisplayName(customer: StorefrontCustomerProfile): string {
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
  return name || customer.email || customer.phone_number || "Customer";
}

export function StorefrontCustomerAccount({
  locale,
  siteName,
}: {
  locale: StorefrontLocale;
  siteName: string;
}) {
  const isSwahili = locale === "sw";
  const [customer, setCustomer] = useState<StorefrontCustomerProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [channel, setChannel] = useState<StorefrontCustomerChannel>("email");
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getCurrentStorefrontCustomer()
      .then((currentCustomer) => {
        if (active) {
          setCustomer(currentCustomer);
        }
      })
      .catch(() => {
        if (active) {
          setErrorMessage(
            isSwahili
              ? "Hatukuweza kuangalia hali ya akaunti yako. Tafadhali jaribu tena."
              : "We could not check your account status. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isSwahili]);

  function clearFeedback() {
    setMessage(null);
    setErrorMessage(null);
  }

  function showError(error: unknown) {
    if (error instanceof StorefrontCustomerRequestError) {
      setErrorMessage(error.message);
      return;
    }
    setErrorMessage(
      isSwahili
        ? "Ombi halikukamilika. Tafadhali jaribu tena."
        : "The request could not be completed. Please try again.",
    );
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const email = String(form.get("email") || "").trim();
    const countryCode = String(form.get("country_code") || "TZ");
    const phoneNumber = String(form.get("phone_number") || "").trim();

    try {
      if (mode === "signin") {
        const signedInCustomer = await loginStorefrontCustomer(
          channel,
          channel === "email"
            ? { email, password }
            : {
                country_code: countryCode,
                phone_number: phoneNumber,
                password,
              },
        );
        setCustomer(signedInCustomer);
        setMessage(isSwahili ? "Umeingia kwenye akaunti yako." : "You are signed in.");
        return;
      }

      const firstName = String(form.get("first_name") || "").trim();
      const lastName = String(form.get("last_name") || "").trim();
      await registerStorefrontCustomer(
        channel,
        channel === "email"
          ? {
              email,
              password,
              first_name: firstName,
              last_name: lastName,
            }
          : {
              country_code: countryCode,
              phone_number: phoneNumber,
              password,
              first_name: firstName,
              last_name: lastName,
            },
      );
      setPendingVerification(
        channel === "email"
          ? { channel, email }
          : { channel, countryCode, phoneNumber },
      );
      setMessage(
        channel === "email"
          ? isSwahili
            ? "Tumetuma nambari ya uthibitisho kwenye barua pepe yako."
            : "We sent a verification code to your email."
          : isSwahili
            ? "Tumetuma nambari ya uthibitisho kwenye simu yako."
            : "We sent a verification code to your phone.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingVerification) {
      return;
    }

    clearFeedback();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") || "").trim();

    try {
      const verifiedCustomer = await verifyStorefrontCustomer(
        pendingVerification.channel,
        pendingVerification.channel === "email"
          ? { email: pendingVerification.email || "", code }
          : {
              country_code: pendingVerification.countryCode || "TZ",
              phone_number: pendingVerification.phoneNumber || "",
              code,
            },
      );
      setCustomer(verifiedCustomer);
      setPendingVerification(null);
      setMessage(
        isSwahili
          ? "Akaunti yako imethibitishwa na umeingia."
          : "Your account is verified and you are signed in.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    clearFeedback();
    setSubmitting(true);
    try {
      await logoutStorefrontCustomer();
      setCustomer(null);
      setMode("signin");
      setPendingVerification(null);
      setMessage(isSwahili ? "Umetoka kwenye akaunti yako." : "You are signed out.");
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <section className="storefront-customer-auth-card" aria-busy="true">
        <p className="storefront-customer-auth-muted">
          {isSwahili ? "Inaangalia akaunti yako..." : "Checking your account..."}
        </p>
      </section>
    );
  }

  if (customer) {
    return (
      <section className="storefront-customer-auth-card storefront-customer-account-card">
        <div>
          <p className="storefront-customer-auth-eyebrow">
            {isSwahili ? "Akaunti yako" : "Your account"}
          </p>
          <h1>{customerDisplayName(customer)}</h1>
          <p className="storefront-customer-auth-muted">
            {isSwahili
              ? `Umeingia kwenye ${siteName}.`
              : `You are signed in to ${siteName}.`}
          </p>
        </div>

        <div className="storefront-customer-account-details">
          {customer.email ? (
            <div>
              <span>{isSwahili ? "Barua pepe" : "Email"}</span>
              <strong>{customer.email}</strong>
              <small>
                {customer.is_email_verified
                  ? isSwahili
                    ? "Imethibitishwa"
                    : "Verified"
                  : isSwahili
                    ? "Haijathibitishwa"
                    : "Not verified"}
              </small>
            </div>
          ) : null}
          {customer.phone_number ? (
            <div>
              <span>{isSwahili ? "Simu" : "Phone"}</span>
              <strong>{customer.phone_number}</strong>
              <small>
                {customer.is_phone_verified
                  ? isSwahili
                    ? "Imethibitishwa"
                    : "Verified"
                  : isSwahili
                    ? "Haijathibitishwa"
                    : "Not verified"}
              </small>
            </div>
          ) : null}
        </div>

        {message ? <p className="storefront-customer-auth-success">{message}</p> : null}
        {errorMessage ? <p className="storefront-customer-auth-error">{errorMessage}</p> : null}

        <button
          className="storefront-customer-auth-secondary-button"
          disabled={submitting}
          onClick={() => void handleLogout()}
          type="button"
        >
          {submitting
            ? isSwahili
              ? "Inatoka..."
              : "Signing out..."
            : isSwahili
              ? "Toka"
              : "Sign out"}
        </button>
      </section>
    );
  }

  if (pendingVerification) {
    return (
      <section className="storefront-customer-auth-card">
        <p className="storefront-customer-auth-eyebrow">
          {isSwahili ? "Thibitisha akaunti" : "Verify account"}
        </p>
        <h1>{isSwahili ? "Weka nambari ya uthibitisho" : "Enter your verification code"}</h1>
        <p className="storefront-customer-auth-muted">
          {pendingVerification.channel === "email"
            ? isSwahili
              ? `Nambari imetumwa kwa ${pendingVerification.email}.`
              : `The code was sent to ${pendingVerification.email}.`
            : isSwahili
              ? `Nambari imetumwa kwa ${pendingVerification.phoneNumber}.`
              : `The code was sent to ${pendingVerification.phoneNumber}.`}
        </p>

        <form className="storefront-customer-auth-form" onSubmit={handleVerificationSubmit}>
          <label>
            <span>{isSwahili ? "Nambari ya uthibitisho" : "Verification code"}</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={16}
              name="code"
              placeholder="123456"
              required
            />
          </label>
          {message ? <p className="storefront-customer-auth-success">{message}</p> : null}
          {errorMessage ? <p className="storefront-customer-auth-error">{errorMessage}</p> : null}
          <button className="storefront-customer-auth-primary-button" disabled={submitting} type="submit">
            {submitting
              ? isSwahili
                ? "Inathibitisha..."
                : "Verifying..."
              : isSwahili
                ? "Thibitisha na uendelee"
                : "Verify and continue"}
          </button>
          <button
            className="storefront-customer-auth-text-button"
            disabled={submitting}
            onClick={() => {
              setPendingVerification(null);
              clearFeedback();
            }}
            type="button"
          >
            {isSwahili ? "Rudi" : "Back"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="storefront-customer-auth-card">
      <p className="storefront-customer-auth-eyebrow">
        {isSwahili ? "Akaunti ya mteja" : "Customer account"}
      </p>
      <h1>
        {mode === "signin"
          ? isSwahili
            ? "Ingia kwenye akaunti yako"
            : "Sign in to your account"
          : isSwahili
            ? "Fungua akaunti"
            : "Create your account"}
      </h1>
      <p className="storefront-customer-auth-muted">
        {isSwahili
          ? "Unaweza kuendelea kuangalia bidhaa bila kuingia. Akaunti inahitajika unapoweka oda."
          : "You can keep browsing without signing in. An account is required when you place an order."}
      </p>

      <div className="storefront-customer-auth-tabs" aria-label={isSwahili ? "Chagua hatua" : "Choose action"}>
        <button
          aria-pressed={mode === "signin"}
          onClick={() => {
            setMode("signin");
            clearFeedback();
          }}
          type="button"
        >
          {isSwahili ? "Ingia" : "Sign in"}
        </button>
        <button
          aria-pressed={mode === "register"}
          onClick={() => {
            setMode("register");
            clearFeedback();
          }}
          type="button"
        >
          {isSwahili ? "Jisajili" : "Create account"}
        </button>
      </div>

      <div className="storefront-customer-channel-toggle">
        <button
          aria-pressed={channel === "email"}
          onClick={() => {
            setChannel("email");
            clearFeedback();
          }}
          type="button"
        >
          {isSwahili ? "Barua pepe" : "Email"}
        </button>
        <button
          aria-pressed={channel === "phone"}
          onClick={() => {
            setChannel("phone");
            clearFeedback();
          }}
          type="button"
        >
          {isSwahili ? "Simu" : "Phone"}
        </button>
      </div>

      <form className="storefront-customer-auth-form" onSubmit={handleAuthSubmit}>
        {mode === "register" ? (
          <div className="storefront-customer-name-grid">
            <label>
              <span>{isSwahili ? "Jina la kwanza" : "First name"}</span>
              <input autoComplete="given-name" maxLength={150} name="first_name" />
            </label>
            <label>
              <span>{isSwahili ? "Jina la mwisho" : "Last name"}</span>
              <input autoComplete="family-name" maxLength={150} name="last_name" />
            </label>
          </div>
        ) : null}

        {channel === "email" ? (
          <label>
            <span>{isSwahili ? "Barua pepe" : "Email"}</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>
        ) : (
          <div className="storefront-customer-phone-grid">
            <label>
              <span>{isSwahili ? "Nchi" : "Country"}</span>
              <select defaultValue="TZ" name="country_code">
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {isSwahili ? country.sw : country.en}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{isSwahili ? "Namba ya simu" : "Phone number"}</span>
              <input autoComplete="tel" name="phone_number" placeholder="0712345678" required type="tel" />
            </label>
          </div>
        )}

        <label>
          <span>{isSwahili ? "Nenosiri" : "Password"}</span>
          <input
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>

        {message ? <p className="storefront-customer-auth-success">{message}</p> : null}
        {errorMessage ? <p className="storefront-customer-auth-error">{errorMessage}</p> : null}

        <button className="storefront-customer-auth-primary-button" disabled={submitting} type="submit">
          {submitting
            ? isSwahili
              ? "Tafadhali subiri..."
              : "Please wait..."
            : mode === "signin"
              ? isSwahili
                ? "Ingia"
                : "Sign in"
              : isSwahili
                ? "Fungua akaunti"
                : "Create account"}
        </button>
      </form>
    </section>
  );
}
