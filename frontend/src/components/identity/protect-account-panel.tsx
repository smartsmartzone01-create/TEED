"use client";

import { CheckCircle2, Mail, Phone, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { VerificationCodeInput } from "@/components/identity/verification-code-input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { useRouter } from "@/i18n/navigation";
import { getProtectAccountCopy } from "@/i18n/messages/identity/protect-account-copy";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useIdentityTransition } from "@/providers/identity/identity-transition-provider";
import { ApiClientError } from "@/services/global/api-client";
import {
  getAccountProtection,
  requestAccountProtectionEmail,
  requestAccountProtectionPhone,
  verifyAccountProtectionEmail,
  verifyAccountProtectionPhone,
} from "@/services/identity/entry";

type ProtectionStep = "add_email" | "verify_email" | "verify_phone";

type ProtectionState = {
  email: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  phone_number: string | null;
  recommended_step: ProtectionStep | null;
};

type ProtectAccountPanelProps = {
  destination: string;
  embedded?: boolean;
  showSkip?: boolean;
};

function ProtectAccountPanel({
  destination,
  embedded = false,
  showSkip = false,
}: ProtectAccountPanelProps) {
  const locale = useLocale();
  const commonT = useTranslations("IdentityCommon");
  const fieldT = useTranslations("IdentityFieldErrors");
  const signupT = useTranslations("Signup");
  const router = useRouter();
  const copy = getProtectAccountCopy(locale);
  const { notify } = useNotification();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();
  const { accessToken, refreshAccessToken, updateUser, user } = useIdentitySession();
  const { beginTransition, endTransition } = useIdentityTransition();
  const [state, setState] = useState<ProtectionState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();

  const withFreshToken = useCallback(
    async <T,>(request: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new Error("Authenticated session is unavailable.");
      try {
        return await request(accessToken);
      } catch (error) {
        if (
          !(error instanceof ApiClientError) ||
          error.details.kind !== "unauthenticated"
        ) {
          throw error;
        }
        return request(await refreshAccessToken());
      }
    },
    [accessToken, refreshAccessToken],
  );

  const updateSessionFromState = useCallback(
    (nextState: ProtectionState) => {
      if (!user) return;
      updateUser({
        ...user,
        email: nextState.email,
        isEmailVerified: nextState.is_email_verified,
        isPhoneVerified: nextState.is_phone_verified,
        phoneNumber: nextState.phone_number,
      });
    },
    [updateUser, user],
  );

  useEffect(() => {
    let active = true;
    withFreshToken((token) => getAccountProtection(token))
      .then((response) => {
        if (!active || !response.data) return;
        setState(response.data);
        setEmail(response.data.email ?? "");
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, withFreshToken]);

  function navigateToDestination() {
    beginTransition("protecting");
    router.push(destination);
  }

  function handleApiError(error: unknown) {
    endTransition();
    if (error instanceof ApiClientError) {
      const emailIssue = firstFieldIssue(error.details.fieldErrors, "email");
      const codeIssue = firstFieldIssue(error.details.fieldErrors, "code");
      if (emailIssue) setEmailError(getFieldMessage(emailIssue));
      if (codeIssue) setCodeError(getFieldMessage(codeIssue));
      notify({ message: getErrorMessage(error.details), tone: "error" });
      return;
    }
    notify({ message: fieldT("invalid"), tone: "error" });
  }

  async function handleSendPhoneCode() {
    setCodeError(undefined);
    beginTransition("protecting");
    try {
      const response = await withFreshToken((token) =>
        requestAccountProtectionPhone(token),
      );
      if (!response.data) throw new Error("Protection response data missing.");
      setState(response.data);
      setCodeSent(true);
      notify({ message: copy.phoneSent, tone: "success" });
      endTransition();
    } catch (error) {
      handleApiError(error);
    }
  }

  async function handleSendEmailCode() {
    setEmailError(undefined);
    setCodeError(undefined);
    const trimmedEmail = email.trim().toLowerCase();
    if (
      state?.recommended_step === "add_email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      setEmailError(fieldT("invalid_email"));
      return;
    }

    beginTransition("protecting");
    try {
      const response = await withFreshToken((token) =>
        requestAccountProtectionEmail(
          state?.recommended_step === "add_email" ? trimmedEmail : null,
          token,
        ),
      );
      if (!response.data) throw new Error("Protection response data missing.");
      setState(response.data);
      setEmail(response.data.email ?? trimmedEmail);
      setCodeSent(true);
      notify({ message: copy.emailSent, tone: "success" });
      endTransition();
    } catch (error) {
      handleApiError(error);
    }
  }

  async function handleVerify(kind: "email" | "phone") {
    setCodeError(undefined);
    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setCodeError(signupT("validation.code"));
      return;
    }

    beginTransition("protecting");
    try {
      const response = await withFreshToken((token) =>
        kind === "phone"
          ? verifyAccountProtectionPhone(normalizedCode, token)
          : verifyAccountProtectionEmail(normalizedCode, token),
      );
      if (!response.data) throw new Error("Protection response data missing.");
      setState(response.data);
      updateSessionFromState(response.data);
      notify({
        message: kind === "phone" ? copy.phoneVerified : copy.emailVerified,
        tone: "success",
      });
      router.push(destination);
    } catch (error) {
      handleApiError(error);
    }
  }

  if (loadFailed) {
    return (
      <div
        className={
          embedded
            ? "rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950"
            : ""
        }
      >
        <p className="text-sm text-red-800 dark:text-red-100">{copy.loading}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setState(null);
            setLoadFailed(false);
            setReloadKey((current) => current + 1);
          }}
          type="button"
          variant="outline"
        >
          {commonT("tryAgain")}
        </Button>
      </div>
    );
  }

  if (!state) {
    return <p className="text-sm text-muted-foreground">{copy.loading}</p>;
  }

  const content = (() => {
    if (!state.recommended_step) {
      return (
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h2 className="mt-4 text-xl font-semibold">{copy.completeTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.completeDescription}
          </p>
          <Button
            className="mt-6 w-full"
            onClick={navigateToDestination}
            size="large"
            type="button"
          >
            {showSkip ? copy.continueDashboard : copy.backContacts}
          </Button>
        </div>
      );
    }

    if (state.recommended_step === "verify_phone") {
      return (
        <>
          <div className="mb-6">
            <Phone className="size-6 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">{copy.verifyPhoneTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.verifyPhoneDescription}
            </p>
          </div>
          <FormField htmlFor="protect-phone" label={copy.phone}>
            <Input id="protect-phone" readOnly value={state.phone_number ?? ""} />
          </FormField>
          {codeSent ? (
            <div className="mt-5">
              <FormField error={codeError} htmlFor="protect-phone-code" label={copy.code} required>
                <VerificationCodeInput
                  id="protect-phone-code"
                  invalid={Boolean(codeError)}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={copy.codePlaceholder}
                  value={code}
                />
              </FormField>
              <Button
                className="mt-5 w-full"
                onClick={() => void handleVerify("phone")}
                size="large"
                type="button"
              >
                {copy.verifyPhone}
              </Button>
            </div>
          ) : (
            <Button
              className="mt-5 w-full"
              onClick={() => void handleSendPhoneCode()}
              size="large"
              type="button"
            >
              {copy.sendCode}
            </Button>
          )}
        </>
      );
    }

    const addingEmail = state.recommended_step === "add_email";
    return (
      <>
        <div className="mb-6">
          <Mail className="size-6 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">
            {addingEmail ? copy.addEmailTitle : copy.verifyEmailTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {addingEmail ? copy.addEmailDescription : copy.verifyEmailDescription}
          </p>
        </div>
        <FormField error={emailError} htmlFor="protect-email" label={copy.email} required>
          <Input
            id="protect-email"
            invalid={Boolean(emailError)}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            readOnly={!addingEmail}
            type="email"
            value={email}
          />
        </FormField>
        {codeSent ? (
          <div className="mt-5">
            <FormField error={codeError} htmlFor="protect-email-code" label={copy.code} required>
              <VerificationCodeInput
                id="protect-email-code"
                invalid={Boolean(codeError)}
                onChange={(event) => setCode(event.target.value)}
                placeholder={copy.codePlaceholder}
                value={code}
              />
            </FormField>
            <Button
              className="mt-5 w-full"
              onClick={() => void handleVerify("email")}
              size="large"
              type="button"
            >
              {copy.verifyEmail}
            </Button>
          </div>
        ) : (
          <Button
            className="mt-5 w-full"
            onClick={() => void handleSendEmailCode()}
            size="large"
            type="button"
          >
            {copy.sendCode}
          </Button>
        )}
      </>
    );
  })();

  return (
    <div
      className={
        embedded
          ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          : ""
      }
    >
      <div className="mb-5 flex items-center gap-2 text-sm font-medium text-primary">
        <ShieldCheck className="size-4" />
        {copy.eyebrow}
      </div>
      {content}
      {showSkip && state.recommended_step ? (
        <Button
          className="mt-3 w-full"
          onClick={navigateToDestination}
          size="large"
          type="button"
          variant="ghost"
        >
          {copy.skip}
        </Button>
      ) : null}
    </div>
  );
}

export { ProtectAccountPanel };
