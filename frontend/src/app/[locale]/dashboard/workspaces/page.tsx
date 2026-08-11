import { setRequestLocale } from "next-intl/server";

import { DashboardWorkspaces } from "@/components/workspace/dashboard-workspaces";

type PageProps = { params: Promise<{ locale: string }> };

export default async function WorkspacesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardWorkspaces />;
}
