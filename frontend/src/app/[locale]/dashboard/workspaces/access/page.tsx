import { setRequestLocale } from "next-intl/server";

import { RequestBusinessAccessForm } from "@/components/workspace/request-business-access-form";

type PageProps = { params: Promise<{ locale: string }> };

export default async function RequestWorkspaceAccessPage({
  params,
}: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RequestBusinessAccessForm />;
}
