import { NotificationInbox } from "@/components/notifications/notification-inbox";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  return (
    <NotificationInbox
      businessId={(await params).businessId}
      scope="workspace"
    />
  );
}
