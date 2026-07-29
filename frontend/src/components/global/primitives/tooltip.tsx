"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type {
  ComponentPropsWithoutRef,
  ReactElement,
  ReactNode,
} from "react";

import { cn } from "@/lib/global/class-names";

type TooltipProviderProps = {
  children: ReactNode;
};

type TooltipProps = {
  align?: ComponentPropsWithoutRef<
    typeof TooltipPrimitive.Content
  >["align"];
  children: ReactElement;
  className?: string;
  content: ReactNode;
  disabled?: boolean;
  side?: ComponentPropsWithoutRef<
    typeof TooltipPrimitive.Content
  >["side"];
};

function TooltipProvider({ children }: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={350}
      skipDelayDuration={150}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

function Tooltip({
  align = "center",
  children,
  className,
  content,
  disabled = false,
  side = "bottom",
}: TooltipProps) {
  if (disabled) {
    return children;
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          align={align}
          className={cn(
            "z-[100] max-w-64 rounded-lg bg-brand-navy px-3 py-2",
            "select-none text-xs font-medium leading-5 text-white",
            "shadow-lg",
            className,
          )}
          side={side}
          sideOffset={8}
        >
          {content}

          <TooltipPrimitive.Arrow className="fill-brand-navy" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };