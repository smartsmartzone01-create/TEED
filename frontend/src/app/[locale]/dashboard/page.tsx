import { setRequestLocale } from "next-intl/server";

import { IdentityBackground } from "@/components/identity/identity-background";
import { IdentityDashboard } from "@/components/identity/identity-dashboard";
import { IdentityHeader } from "@/components/identity/identity-header";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({
  params,
}: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <IdentityBackground />
      <IdentityHeader />
      <div className="relative z-10">
        <IdentityDashboard />
      </div>
    </div>
  );
}
