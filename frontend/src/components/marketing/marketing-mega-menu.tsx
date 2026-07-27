"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type MarketingMegaMenuProps = {
  children: ReactNode;
  closeLabel: string;
  label: string;
  openLabel: string;
};

function MarketingMegaMenu({
  children,
  closeLabel,
  label,
  openLabel,
}: MarketingMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? closeLabel : openLabel}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={() => setOpen((current) => !current)}
      >
        {label}

        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full z-50 mt-px overflow-hidden rounded-b-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export { MarketingMegaMenu };
export type { MarketingMegaMenuProps };