import { setRequestLocale } from "next-intl/server";

import { WorkspaceEntry } from "@/components/workspace/workspace-entry";

type WorkspacePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WorkspaceEntry />;
}
