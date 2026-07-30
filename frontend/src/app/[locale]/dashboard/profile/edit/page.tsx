import { setRequestLocale } from "next-intl/server";

import { ProfileEditForm } from "@/components/profile/profile-edit-form";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileEditForm />;
}
