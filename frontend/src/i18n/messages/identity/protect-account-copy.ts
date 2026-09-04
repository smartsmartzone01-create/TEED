type ProtectAccountCopy = {
  addEmailDescription: string;
  addEmailTitle: string;
  backContacts: string;
  code: string;
  codePlaceholder: string;
  completeDescription: string;
  completeTitle: string;
  continueDashboard: string;
  description: string;
  email: string;
  emailPlaceholder: string;
  emailSent: string;
  emailVerified: string;
  eyebrow: string;
  loading: string;
  protectAction: string;
  sendCode: string;
  skip: string;
  submitting: string;
  title: string;
  verifyEmail: string;
  verifyEmailDescription: string;
  verifyEmailTitle: string;
  verifyPhone: string;
  verifyPhoneDescription: string;
  verifyPhoneTitle: string;
  phone: string;
  phoneSent: string;
  phoneVerified: string;
};

const COPY: Record<"en" | "sw", ProtectAccountCopy> = {
  en: {
    addEmailDescription:
      "Add an email address once, then verify that same address with a code.",
    addEmailTitle: "Add a verified email",
    backContacts: "Back to contacts",
    code: "Verification code",
    codePlaceholder: "123456",
    completeDescription:
      "You already have a second verified contact method for account recovery and security.",
    completeTitle: "Your account is protected",
    continueDashboard: "Continue to dashboard",
    description:
      "Add a second verified contact method to make account recovery easier and strengthen your account security.",
    email: "Email address",
    emailPlaceholder: "you@example.com",
    emailSent: "A verification code was sent to your email.",
    emailVerified: "Email verified.",
    eyebrow: "Account security",
    loading: "Loading your account protection options…",
    protectAction: "Protect account",
    sendCode: "Send verification code",
    skip: "Skip for now",
    submitting: "Protecting your account…",
    title: "Protect your account",
    verifyEmail: "Verify email",
    verifyEmailDescription:
      "We will verify the email already attached to your account. It cannot be changed during this verification.",
    verifyEmailTitle: "Verify your email",
    verifyPhone: "Verify mobile",
    verifyPhoneDescription:
      "We will verify the mobile number you added during onboarding. It cannot be changed during this verification.",
    verifyPhoneTitle: "Verify your mobile number",
    phone: "Mobile number",
    phoneSent: "A verification code was sent to your mobile number.",
    phoneVerified: "Mobile number verified.",
  },
  sw: {
    addEmailDescription:
      "Ongeza anwani ya barua pepe mara moja, kisha thibitisha anwani hiyo hiyo kwa nambari ya uthibitishaji.",
    addEmailTitle: "Ongeza barua pepe iliyothibitishwa",
    backContacts: "Rudi kwenye mawasiliano",
    code: "Nambari ya uthibitishaji",
    codePlaceholder: "123456",
    completeDescription:
      "Tayari una njia ya pili ya mawasiliano iliyothibitishwa kwa urejeshaji na usalama wa akaunti.",
    completeTitle: "Akaunti yako imelindwa",
    continueDashboard: "Endelea kwenye dashibodi",
    description:
      "Ongeza njia ya pili ya mawasiliano iliyothibitishwa ili kurahisisha kurejesha akaunti na kuimarisha usalama wake.",
    email: "Anwani ya barua pepe",
    emailPlaceholder: "wewe@example.com",
    emailSent: "Nambari ya uthibitishaji imetumwa kwenye barua pepe yako.",
    emailVerified: "Barua pepe imethibitishwa.",
    eyebrow: "Usalama wa akaunti",
    loading: "Chaguo za kulinda akaunti yako zinapakiwa…",
    protectAction: "Linda akaunti",
    sendCode: "Tuma nambari ya uthibitishaji",
    skip: "Ruka kwa sasa",
    submitting: "Akaunti yako inalindwa…",
    title: "Linda akaunti yako",
    verifyEmail: "Thibitisha barua pepe",
    verifyEmailDescription:
      "Tutathibitisha barua pepe ambayo tayari imeunganishwa na akaunti yako. Haiwezi kubadilishwa wakati wa uthibitishaji huu.",
    verifyEmailTitle: "Thibitisha barua pepe yako",
    verifyPhone: "Thibitisha simu",
    verifyPhoneDescription:
      "Tutathibitisha nambari ya simu uliyoweka wakati wa usanidi. Haiwezi kubadilishwa wakati wa uthibitishaji huu.",
    verifyPhoneTitle: "Thibitisha nambari yako ya simu",
    phone: "Nambari ya simu",
    phoneSent: "Nambari ya uthibitishaji imetumwa kwenye simu yako.",
    phoneVerified: "Nambari ya simu imethibitishwa.",
  },
};

function getProtectAccountCopy(locale: string): ProtectAccountCopy {
  return locale.startsWith("sw") ? COPY.sw : COPY.en;
}

export { getProtectAccountCopy };
export type { ProtectAccountCopy };
