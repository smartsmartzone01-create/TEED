import { setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { PostAuthRouter } from "@/components/workspace/post-auth-router";
import { WorkspaceProvider } from "@/providers/workspace/workspace-provider";

type PageProps = { params: Promise<{ locale: string }> };

export default async function AuthenticatedHomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <IdentityAccessBoundary access="dashboard">
      <WorkspaceProvider>
        <PostAuthRouter />
      </WorkspaceProvider>
    </IdentityAccessBoundary>
  );
}
