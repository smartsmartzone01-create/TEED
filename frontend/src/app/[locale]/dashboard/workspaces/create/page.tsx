import { setRequestLocale } from "next-intl/server";

import { CreateBusinessForm } from "@/components/workspace/create-business-form";

type PageProps = { params: Promise<{ locale: string }> };

export default async function CreateWorkspacePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CreateBusinessForm />;
}
