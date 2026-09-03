"use client";

import { useEffect, useState } from "react";

import { BrandLoader } from "@/components/global/brand/brand-loader";

const PREVIEW_DURATION_MS = 20_000;

export default function LoadingPreviewPage() {
  const [run, setRun] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsLoading(false);
    }, PREVIEW_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [run]);

  return (
    <main className="relative min-h-svh bg-background text-foreground">
      <div className="absolute left-4 top-4 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur sm:left-6 sm:top-6">
        20-second loading preview
      </div>

      {isLoading ? (
        <BrandLoader
          className="min-h-svh"
          label="Tunakuza loading preview"
          size="page"
        />
      ) : (
        <div className="flex min-h-svh items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Loading preview complete.
            </p>
            <button
              className="mt-4 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => {
                setIsLoading(true);
                setRun((value) => value + 1);
              }}
              type="button"
            >
              Replay 20-second test
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
