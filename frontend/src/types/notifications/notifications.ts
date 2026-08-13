type NotificationCategory = "account" | "security" | "system" | "workspace";
type NotificationScope = "cross_business" | "membership" | "personal" | "workspace";
type NotificationItem = {
  id: string;
  category: NotificationCategory;
  template: string;
  context: Record<string, string | number>;
  action_path: string;
  business_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
  scope: NotificationScope;
};
type NotificationPage = {
  notifications: NotificationItem[];
  unread_count: number;
};
export type { NotificationCategory, NotificationItem, NotificationPage, NotificationScope };
