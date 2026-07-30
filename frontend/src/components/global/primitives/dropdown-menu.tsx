"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";

import { cn } from "@/lib/global/class-names";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "flex cursor-pointer select-none items-center gap-3 rounded-xl",
      "px-3 py-2.5 text-sm font-medium text-foreground/75",
      "outline-none transition-colors",
      "data-highlighted:bg-foreground/5 data-highlighted:text-foreground",
      "data-disabled:pointer-events-none data-disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));

DropdownMenuItem.displayName =
  DropdownMenuPrimitive.Item.displayName;

const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ children, className, sideOffset = 10, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        "z-[100] min-w-52 rounded-2xl",
        "border border-brand-navy/15 bg-background/95 p-2",
        "text-foreground shadow-xl backdrop-blur-xl",
        "outline-none",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    >
      {children}

      <DropdownMenuPrimitive.Arrow className="fill-background" />
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
));

DropdownMenuContent.displayName =
  DropdownMenuPrimitive.Content.displayName;

const DropdownMenuLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    className={cn(
      "px-3 pb-2 pt-1 text-xs font-semibold",
      "uppercase tracking-wider text-muted-foreground",
      className,
    )}
    ref={ref}
    {...props}
  />
));

DropdownMenuLabel.displayName =
  DropdownMenuPrimitive.Label.displayName;

const DropdownMenuRadioItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ children, className, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    className={cn(
      "relative flex cursor-pointer select-none items-center",
      "gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
      "text-foreground/75 outline-none transition-colors",
      "data-highlighted:bg-brand-navy/10",
      "data-highlighted:text-brand-navy",
      "data-[state=checked]:bg-brand-orange/15",
      "data-[state=checked]:text-brand-navy",
      "data-disabled:pointer-events-none",
      "data-disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  >
    <span className="flex size-5 shrink-0 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check
          aria-hidden="true"
          className="size-4 text-brand-orange"
        />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>

    {children}
  </DropdownMenuPrimitive.RadioItem>
));

DropdownMenuRadioItem.displayName =
  DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    className={cn("my-1 h-px bg-border", className)}
    ref={ref}
    {...props}
  />
));

DropdownMenuSeparator.displayName =
  DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
