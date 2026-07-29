"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/global/primitives/tooltip";
import { NotificationProvider } from "@/providers/global/notification-provider";
import { IdentitySessionProvider } from "@/providers/identity/identity-session-provider";

type GlobalProvidersProps = {
  children: ReactNode;
};

function GlobalProviders({ children }: GlobalProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="teed-theme"
    >
      <TooltipProvider>
        <NotificationProvider>
          <IdentitySessionProvider>
            {children}
          </IdentitySessionProvider>
        </NotificationProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export { GlobalProviders };