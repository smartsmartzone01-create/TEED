import { setRequestLocale } from "next-intl/server";

import { SecurityOverview } from "@/components/security/security-overview";

type PageProps = { params: Promise<{ locale: string }> };

export default async function SecurityPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SecurityOverview />;
}
