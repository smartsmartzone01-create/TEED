import { setRequestLocale } from "next-intl/server";

import { PersonalInformation } from "@/components/profile/personal-information";

export default async function PersonalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PersonalInformation />;
}
