"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

const viewportSelector = ".stock-ledger-desktop";

function StockLedgerNavigation() {
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const syncingRef = useRef(false);

  const previousLabel = locale.toLowerCase().startsWith("sw")
    ? "Sogeza orodha ya mzigo kushoto"
    : "Move stock list left";
  const nextLabel = locale.toLowerCase().startsWith("sw")
    ? "Sogeza orodha ya mzigo kulia"
    : "Move stock list right";

  const getShell = useCallback(
    () => rootRef.current?.closest<HTMLElement>(".stock-workspace-shell") ?? null,
    [],
  );

  const getViewports = useCallback(() => {
    const shell = getShell();
    return shell
      ? Array.from(shell.querySelectorAll<HTMLElement>(viewportSelector))
      : [];
  }, [getShell]);

  const getStockSection = useCallback(() => {
    const shell = getShell();
    const host = shell?.querySelector<HTMLElement>(".stock-progressive-host");
    return (
      host?.querySelector<HTMLElement>(
        ":scope > div > section:nth-of-type(2)",
      ) ?? null
    );
  }, [getShell]);

  const syncControls = useCallback(() => {
    const previous = previousRef.current;
    const next = nextRef.current;
    const section = getStockSection();
    const [viewport] = getViewports();

    if (!previous || !next || !section || !viewport || window.innerWidth < 768) {
      if (previous) previous.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    const sectionRect = section.getBoundingClientRect();
    const viewportMiddle = window.innerHeight / 2;
    const sectionAtViewportMiddle =
      sectionRect.top <= viewportMiddle && sectionRect.bottom >= viewportMiddle;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const hasOverflow = maxScroll > 2;

    previous.style.left = `${Math.max(10, sectionRect.left + 10)}px`;
    next.style.right = `${Math.max(10, window.innerWidth - sectionRect.right + 10)}px`;

    previous.hidden =
      !sectionAtViewportMiddle || !hasOverflow || viewport.scrollLeft <= 2;
    next.hidden =
      !sectionAtViewportMiddle ||
      !hasOverflow ||
      viewport.scrollLeft >= maxScroll - 2;
  }, [getStockSection, getViewports]);

  useEffect(() => {
    const shell = getShell();
    if (!shell) return;

    const host = shell.querySelector<HTMLElement>(".stock-progressive-host");
    if (!host) return;

    const syncFromViewport = (source: HTMLElement) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      const left = source.scrollLeft;
      for (const viewport of getViewports()) {
        if (viewport !== source && Math.abs(viewport.scrollLeft - left) > 1) {
          viewport.scrollLeft = left;
        }
      }
      window.requestAnimationFrame(() => {
        syncingRef.current = false;
        syncControls();
      });
    };

    const handleScroll = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.classList.contains("stock-ledger-desktop")
      ) {
        syncFromViewport(target);
      }
    };

    const observeViewports = (observer: ResizeObserver) => {
      for (const viewport of getViewports()) observer.observe(viewport);
    };

    const resizeObserver = new ResizeObserver(syncControls);
    resizeObserver.observe(host);
    observeViewports(resizeObserver);

    const mutationObserver = new MutationObserver(() => {
      observeViewports(resizeObserver);
      syncControls();
    });
    mutationObserver.observe(host, { childList: true, subtree: true });

    const frame = window.requestAnimationFrame(syncControls);
    host.addEventListener("scroll", handleScroll, true);
    window.addEventListener("scroll", syncControls, { passive: true });
    window.addEventListener("resize", syncControls);

    return () => {
      window.cancelAnimationFrame(frame);
      host.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", syncControls);
      window.removeEventListener("resize", syncControls);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [getShell, getViewports, syncControls]);

  const move = (direction: -1 | 1) => {
    const [viewport] = getViewports();
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * Math.max(280, viewport.clientWidth * 0.72),
      behavior: "smooth",
    });
  };

  const controlClass =
    "pointer-events-auto fixed top-1/2 z-50 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/90 bg-white/95 text-slate-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 dark:border-slate-600/90 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white";

  return (
    <div className="pointer-events-none" ref={rootRef}>
      <button
        aria-label={previousLabel}
        className={controlClass}
        hidden
        onClick={() => move(-1)}
        ref={previousRef}
        title={previousLabel}
        type="button"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        aria-label={nextLabel}
        className={controlClass}
        hidden
        onClick={() => move(1)}
        ref={nextRef}
        title={nextLabel}
        type="button"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export { StockLedgerNavigation };
