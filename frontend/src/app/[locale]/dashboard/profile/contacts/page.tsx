import { setRequestLocale } from "next-intl/server";

import { ContactInformation } from "@/components/profile/contact-information";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactInformation />;
}
