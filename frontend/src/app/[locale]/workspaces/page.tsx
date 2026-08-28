import { setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { WorkspaceDirectory } from "@/components/workspace/workspace-directory";
import { WorkspaceDirectoryShell } from "@/components/workspace/workspace-directory-shell";
import { WorkspaceProvider } from "@/providers/workspace/workspace-provider";

type PageProps = { params: Promise<{ locale: string }> };

export default async function WorkspaceDirectoryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <IdentityAccessBoundary access="dashboard">
      <WorkspaceProvider>
        <WorkspaceDirectoryShell>
          <WorkspaceDirectory surface="standalone" />
        </WorkspaceDirectoryShell>
      </WorkspaceProvider>
    </IdentityAccessBoundary>
  );
}
