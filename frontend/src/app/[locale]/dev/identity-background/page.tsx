import { setRequestLocale } from "next-intl/server";

import { IdentityBackground } from "@/components/identity/identity-background";
import { IdentityHeader } from "@/components/identity/identity-header";

type IdentityBackgroundPreviewPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function IdentityBackgroundPreviewPage({
  params,
}: IdentityBackgroundPreviewPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <div
      style={{
        isolation: "isolate",
        minHeight: "100svh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <IdentityBackground />
      <IdentityHeader />

      <main
        style={{
          position: "relative",
          zIndex: 10,
        }}
      />
    </div>
  );
}
