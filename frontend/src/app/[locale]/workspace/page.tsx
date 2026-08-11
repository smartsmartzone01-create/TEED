import { setRequestLocale } from "next-intl/server";

import { WorkspaceOverview } from "@/components/workspace/workspace-overview";

type WorkspacePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WorkspaceOverview />;
}
