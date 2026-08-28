"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/global/class-names";
import { frontendBrandText } from "@/utils/global/product-brand";

type NotificationTone = "error" | "info" | "success";

type NotificationInput = {
  duration?: number;
  message: string;
  title?: string;
  tone?: NotificationTone;
};

type NotificationItem = Required<
  Pick<NotificationInput, "message" | "tone">
> & {
  id: string;
  title?: string;
};

type NotificationContextValue = {
  dismiss: (id: string) => void;
  notify: (notification: NotificationInput) => string;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toneStyles: Record<NotificationTone, string> = {
  error:
    "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-50",
  info:
    "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50",
};

const toneIcons = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
} satisfies Record<NotificationTone, typeof Info>;

type NotificationProviderProps = {
  children: ReactNode;
};

function NotificationProvider({ children }: NotificationProviderProps) {
  const t = useTranslations("Notifications");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timeouts = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timeout = timeouts.current.get(id);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      timeouts.current.delete(id);
    }
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const notify = useCallback(
    ({ duration = 5000, message, title, tone = "info" }: NotificationInput) => {
      const id = crypto.randomUUID();

      setNotifications((current) => [
        ...current,
        {
          id,
          message: frontendBrandText(message),
          title: title ? frontendBrandText(title) : undefined,
          tone,
        },
      ]);

      const timeout = window.setTimeout(() => dismiss(id), duration);
      timeouts.current.set(id, timeout);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimeouts = timeouts.current;
    return () => {
      activeTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      activeTimeouts.clear();
    };
  }, []);

  const value = useMemo(() => ({ dismiss, notify }), [dismiss, notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <div
        aria-label={t("regionLabel")}
        className={cn(
          "pointer-events-none fixed inset-x-4 top-4 z-[200]",
          "flex flex-col items-center gap-3 sm:top-6",
        )}
      >
        {notifications.map((notification) => {
          const Icon = toneIcons[notification.tone];
          return (
            <div
              className={cn(
                "pointer-events-auto flex w-full max-w-md gap-3",
                "rounded-xl border p-4 shadow-xl backdrop-blur",
                toneStyles[notification.tone],
              )}
              key={notification.id}
              role={notification.tone === "error" ? "alert" : "status"}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                {notification.title ? (
                  <p className="font-semibold">{notification.title}</p>
                ) : null}
                <p className="text-sm leading-6">{notification.message}</p>
              </div>
              <button
                aria-label={t("dismiss")}
                className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2"
                onClick={() => dismiss(notification.id)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

function useNotification() {
  const context = useContext(NotificationContext);
  if (context === null) {
    throw new Error("useNotification must be used within NotificationProvider.");
  }
  return context;
}

export { NotificationProvider, useNotification };
export type { NotificationInput, NotificationTone };
