"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  confirmStorefrontCustomerPasswordReset,
  requestStorefrontCustomerPasswordReset,
  StorefrontCustomerRequestError,
  verifyStorefrontCustomerPasswordReset,
  type StorefrontCustomerChannel,
} from "@/services/storefront-customer-auth-client";
import type { StorefrontLocale } from "@/types/storefront";

type ResetStep = "request" | "verify" | "confirm" | "complete";

type ResetIdentity = {
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

export function StorefrontCustomerPasswordReset({
  locale,
}: {
  locale: StorefrontLocale;
}) {
  const isSwahili = locale === "sw";
  const [step, setStep] = useState<ResetStep>("request");
  const [channel, setChannel] = useState<StorefrontCustomerChannel>("email");
  const [identity, setIdentity] = useState<ResetIdentity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const countryCode = String(form.get("country_code") || "TZ");
    const phoneNumber = String(form.get("phone_number") || "").trim();
    const nextIdentity: ResetIdentity =
      channel === "email"
        ? { channel, email }
        : { channel, countryCode, phoneNumber };

    try {
      await requestStorefrontCustomerPasswordReset(
        channel === "email"
          ? { channel, email }
          : {
              channel,
              country_code: countryCode,
              phone_number: phoneNumber,
            },
      );
      setIdentity(nextIdentity);
      setStep("verify");
      setMessage(
        isSwahili
          ? "Ikiwa akaunti inastahili, tumetuma nambari ya kubadilisha nenosiri."
          : "If the account is eligible, we sent a password reset code.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity) {
      return;
    }
    clearFeedback();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") || "").trim();

    try {
      await verifyStorefrontCustomerPasswordReset(
        identity.channel === "email"
          ? {
              channel: identity.channel,
              email: identity.email || "",
              code,
            }
          : {
              channel: identity.channel,
              country_code: identity.countryCode || "TZ",
              phone_number: identity.phoneNumber || "",
              code,
            },
      );
      setStep("confirm");
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("new_password") || "");
    const newPasswordConfirm = String(form.get("new_password_confirm") || "");

    try {
      await confirmStorefrontCustomerPasswordReset({
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setStep("complete");
      setMessage(
        isSwahili
          ? "Nenosiri limebadilishwa. Sasa unaweza kuingia kwa nenosiri jipya."
          : "Your password has been changed. You can now sign in with the new password.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "complete") {
    return (
      <section className="storefront-customer-auth-card">
        <h1>{isSwahili ? "Nenosiri limebadilishwa" : "Password changed"}</h1>
        {message ? <p className="storefront-customer-auth-success">{message}</p> : null}
        <Link className="storefront-customer-auth-primary-button" href="/account">
          {isSwahili ? "Rudi kuingia" : "Back to sign in"}
        </Link>
      </section>
    );
  }

  return (
    <section className="storefront-customer-auth-card">
      <h1>
        {step === "request"
          ? isSwahili
            ? "Umesahau nenosiri?"
            : "Forgot password?"
          : step === "verify"
            ? isSwahili
              ? "Thibitisha nambari"
              : "Verify reset code"
            : isSwahili
              ? "Chagua nenosiri jipya"
              : "Choose a new password"}
      </h1>

      {step === "request" ? (
        <>
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

          <form className="storefront-customer-auth-form" onSubmit={handleRequest}>
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
                  <input
                    autoComplete="tel"
                    name="phone_number"
                    placeholder="0712345678"
                    required
                    type="tel"
                  />
                </label>
              </div>
            )}
            {errorMessage ? <p className="storefront-customer-auth-error">{errorMessage}</p> : null}
            <button className="storefront-customer-auth-primary-button" disabled={submitting} type="submit">
              {submitting
                ? isSwahili
                  ? "Inatuma..."
                  : "Sending..."
                : isSwahili
                  ? "Tuma nambari"
                  : "Send reset code"}
            </button>
          </form>
        </>
      ) : null}

      {step === "verify" ? (
        <form className="storefront-customer-auth-form" onSubmit={handleVerify}>
          {message ? <p className="storefront-customer-auth-success">{message}</p> : null}
          <label>
            <span>{isSwahili ? "Nambari ya uthibitisho" : "Reset code"}</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={16}
              name="code"
              placeholder="123456"
              required
            />
          </label>
          {errorMessage ? <p className="storefront-customer-auth-error">{errorMessage}</p> : null}
          <button className="storefront-customer-auth-primary-button" disabled={submitting} type="submit">
            {submitting
              ? isSwahili
                ? "Inathibitisha..."
                : "Verifying..."
              : isSwahili
                ? "Thibitisha"
                : "Verify code"}
          </button>
        </form>
      ) : null}

      {step === "confirm" ? (
        <form className="storefront-customer-auth-form" onSubmit={handleConfirm}>
          <label>
            <span>{isSwahili ? "Nenosiri jipya" : "New password"}</span>
            <input autoComplete="new-password" name="new_password" required type="password" />
          </label>
          <label>
            <span>{isSwahili ? "Rudia nenosiri jipya" : "Confirm new password"}</span>
            <input
              autoComplete="new-password"
              name="new_password_confirm"
              required
              type="password"
            />
          </label>
          {errorMessage ? <p className="storefront-customer-auth-error">{errorMessage}</p> : null}
          <button className="storefront-customer-auth-primary-button" disabled={submitting} type="submit">
            {submitting
              ? isSwahili
                ? "Inabadilisha..."
                : "Changing..."
              : isSwahili
                ? "Badilisha nenosiri"
                : "Change password"}
          </button>
        </form>
      ) : null}

      <Link className="storefront-customer-auth-text-button" href="/account">
        {isSwahili ? "Rudi kuingia" : "Back to sign in"}
      </Link>
    </section>
  );
}
