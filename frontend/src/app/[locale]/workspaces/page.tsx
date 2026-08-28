import { setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { WorkspaceDirectory } from "@/components/workspace/workspace-directory";
import { WorkspaceProvider } from "@/providers/workspace/workspace-provider";

type PageProps = { params: Promise<{ locale: string }> };

export default async function WorkspaceDirectoryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <IdentityAccessBoundary access="dashboard">
      <WorkspaceProvider>
        <main className="min-h-svh bg-slate-50 dark:bg-slate-950">
          <WorkspaceDirectory surface="standalone" />
        </main>
      </WorkspaceProvider>
    </IdentityAccessBoundary>
  );
}
