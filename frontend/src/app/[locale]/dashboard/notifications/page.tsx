import { setRequestLocale } from "next-intl/server";

import { NotificationInbox } from "@/components/notifications/notification-inbox";

type PageProps = { params: Promise<{ locale: string }> };

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NotificationInbox />;
}
