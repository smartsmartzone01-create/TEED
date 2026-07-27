"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/global/primitives/tooltip";

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
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
}

export { GlobalProviders };