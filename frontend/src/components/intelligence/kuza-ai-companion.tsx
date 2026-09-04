"use client";

import {
  LoaderCircle,
  Maximize2,
  Minimize2,
  Send,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { KuzaAIIcon } from "@/components/intelligence/kuza-ai-icon";
import { KuzaAIResponse } from "@/components/intelligence/kuza-ai-response";
import { useKuzaAIConversation } from "@/hooks/intelligence/use-kuza-ai-conversation";
import { cn } from "@/lib/global/class-names";
import type { KuzaAIMode } from "@/types/intelligence/kuza-ai";

type KuzaAICompanionProps = {
  businessId: string;
  mode: KuzaAIMode;
  onModeChange: (mode: KuzaAIMode) => void;
};

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "0px";
  const maxHeight = 144;
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, 40), maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function KuzaAICompanion({
  businessId,
  mode,
  onModeChange,
}: KuzaAICompanionProps) {
  const t = useTranslations("KuzaAI");
  const locale = useLocale() === "sw" ? "sw" : "en";
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { clearError, error, messages, sendMessage, sending } =
    useKuzaAIConversation({ businessId, locale });

  useEffect(() => {
    if (mode === "closed") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, mode, sending]);

  const submitMessage = (message: string) => {
    const cleaned = message.trim();
    if (!cleaned || sending) return;
    setDraft("");
    if (composerRef.current) {
      composerRef.current.style.height = "40px";
      composerRef.current.style.overflowY = "hidden";
    }
    clearError();
    void sendMessage(cleaned);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(draft);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submitMessage(draft);
    }
  };

  if (mode === "closed") {
    return (
      <button
        aria-label={t("open")}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:shadow-black/30 dark:hover:border-slate-600 sm:px-3"
        onClick={() => onModeChange("panel")}
        type="button"
      >
        <KuzaAIIcon className="size-7 rounded-lg" />
        <span className="hidden sm:inline">Kuza AI</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Kuza AI"
      className={cn(
        "fixed inset-0 z-50 flex min-h-0 flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50",
        "lg:sticky lg:inset-auto lg:top-14 lg:z-20 lg:h-[calc(100svh-3.5rem)] lg:min-h-[calc(100svh-3.5rem)] lg:self-start lg:border-l lg:border-slate-200 lg:dark:border-slate-800",
        mode === "expanded"
          ? "lg:min-w-0 lg:flex-1"
          : "lg:w-[min(23rem,34vw)] lg:shrink-0",
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <KuzaAIIcon />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
              Kuza AI
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={mode === "expanded" ? t("restore") : t("expand")}
            className="hidden size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white lg:inline-flex"
            onClick={() =>
              onModeChange(mode === "expanded" ? "panel" : "expanded")
            }
            title={mode === "expanded" ? t("restore") : t("expand")}
            type="button"
          >
            {mode === "expanded" ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
          <button
            aria-label={t("close")}
            className="inline-flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            onClick={() => onModeChange("closed")}
            title={t("close")}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          aria-live="polite"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center py-8">
              <KuzaAIIcon className="mb-4 size-10 rounded-2xl" />
              <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                {t("welcomeTitle")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t("welcomeBody")}
              </p>
              <div className="mt-6 grid gap-2">
                {["businessToday", "attention", "financing"].map((key) => (
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    disabled={sending}
                    key={key}
                    onClick={() => submitMessage(t(`prompts.${key}`))}
                    type="button"
                  >
                    {t(`prompts.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div className="flex justify-end" key={message.id}>
                    <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white dark:bg-white dark:text-slate-950">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-w-0 py-1" key={message.id}>
                    <KuzaAIResponse content={message.content} />
                  </div>
                ),
              )}
              {sending ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <LoaderCircle className="size-4 animate-spin" />
                    <span>{t("thinking")}</span>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          {error ? (
            <div
              className="mx-auto mb-2 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300"
              role="alert"
            >
              {t("error")}
            </div>
          ) : null}
          <form className="mx-auto w-full max-w-3xl" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-slate-800">
              <div className="flex items-end gap-2">
                <textarea
                  aria-label={t("composerLabel")}
                  className="min-h-10 max-h-36 flex-1 resize-none overflow-y-hidden bg-transparent px-2 py-2 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                  disabled={sending}
                  maxLength={4000}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    resizeComposer(event.currentTarget);
                    if (error) clearError();
                  }}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={t("placeholder")}
                  ref={composerRef}
                  rows={1}
                  value={draft}
                />
                <button
                  aria-label={t("send")}
                  className="mb-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  disabled={sending || draft.trim().length === 0}
                  title={t("send")}
                  type="submit"
                >
                  {sending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </div>
              {draft.length > 3200 ? (
                <p className="px-2 pb-1 text-right text-[10px] text-slate-400 dark:text-slate-500">
                  {draft.length}/4000
                </p>
              ) : null}
            </div>
            <p className="mt-1.5 px-1 text-center text-[10px] leading-4 text-slate-400 dark:text-slate-500">
              {t("disclaimer")}
            </p>
          </form>
        </div>
      </div>
    </aside>
  );
}

export { KuzaAICompanion };
