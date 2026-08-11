type NotificationCategory = "account" | "security" | "system" | "workspace";
type NotificationItem = {
  id: string;
  category: NotificationCategory;
  template: string;
  context: Record<string, string | number>;
  action_path: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
};
type NotificationPage = {
  notifications: NotificationItem[];
  unread_count: number;
};
export type { NotificationCategory, NotificationItem, NotificationPage };
