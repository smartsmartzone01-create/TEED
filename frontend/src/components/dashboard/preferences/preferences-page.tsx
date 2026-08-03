"use client";

import { Accessibility, CalendarClock, Languages, Palette, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { usePreferences } from "@/providers/dashboard/preferences-provider";
import { ApiClientError } from "@/services/global/api-client";
import type { UserPreferenceUpdate } from "@/types/dashboard/preferences";

function PreferencesPage() {
  const t = useTranslations("Preferences");
  const { notify } = useNotification();
  const { preferences, refresh, status, update } = usePreferences();
  const [saving, setSaving] = useState<string | null>(null);

  async function save(field: string, values: UserPreferenceUpdate) {
    setSaving(field);
    try {
      await update(values);
      notify({ message: t("saved"), tone: "success" });
    } catch (error) {
      notify({
        message: error instanceof ApiClientError ? error.details.message : t("saveError"),
        tone: "error",
      });
    } finally {
      setSaving(null);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  if (status === "error" || !preferences) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm">{t("loadError")}</p>
        <Button className="mt-4" onClick={() => void refresh()} size="small" variant="outline">
          <RotateCcw className="size-4" />
          {t("retry")}
        </Button>
      </section>
    );
  }

  const sections = [
    {
      icon: Languages,
      key: "language",
      content: (
        <Select
          aria-label={t("language.label")}
          disabled={saving === "language"}
          onChange={(event) => void save("language", { language: event.target.value as "en" | "sw" })}
          value={preferences.language}
        >
          <option value="en">{t("language.english")}</option>
          <option value="sw">{t("language.swahili")}</option>
        </Select>
      ),
    },
    {
      icon: Palette,
      key: "appearance",
      content: (
        <Select
          aria-label={t("appearance.label")}
          disabled={saving === "appearance"}
          onChange={(event) => void save("appearance", { appearance: event.target.value as "system" | "light" | "dark" })}
          value={preferences.appearance}
        >
          <option value="system">{t("appearance.system")}</option>
          <option value="light">{t("appearance.light")}</option>
          <option value="dark">{t("appearance.dark")}</option>
        </Select>
      ),
    },
    {
      icon: CalendarClock,
      key: "dateTime",
      content: (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">{t("dateTime.timezone")}</span>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-800"
              disabled={saving === "timezone"}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value && value !== preferences.timezone) void save("timezone", { timezone: value });
              }}
              defaultValue={preferences.timezone}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">{t("dateTime.dateFormat")}</span>
            <Select
              disabled={saving === "date_format"}
              onChange={(event) => void save("date_format", { date_format: event.target.value as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" })}
              value={preferences.date_format}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">{t("dateTime.timeFormat")}</span>
            <Select
              disabled={saving === "time_format"}
              onChange={(event) => void save("time_format", { time_format: event.target.value as "12h" | "24h" })}
              value={preferences.time_format}
            >
              <option value="12h">{t("dateTime.twelveHour")}</option>
              <option value="24h">{t("dateTime.twentyFourHour")}</option>
            </Select>
          </label>
        </div>
      ),
    },
    {
      icon: Accessibility,
      key: "accessibility",
      content: (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <span>
            <span className="block text-sm font-medium">{t("accessibility.reducedMotion")}</span>
            <span className="mt-1 block text-xs text-slate-500">{t("accessibility.reducedMotionHelp")}</span>
          </span>
          <input
            checked={preferences.reduced_motion}
            disabled={saving === "reduced_motion"}
            onChange={(event) => void save("reduced_motion", { reduced_motion: event.target.checked })}
            type="checkbox"
          />
        </label>
      ),
    },
  ] as const;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-brand-orange">{t("eyebrow")}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t("description")}</p>
      </header>
      <div className="space-y-4">
        {sections.map(({ content, icon: Icon, key }) => (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" key={key}>
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900"><Icon className="size-4.5" /></span>
              <div><h3 className="font-semibold">{t(`${key}.title`)}</h3><p className="mt-1 text-sm text-slate-500">{t(`${key}.description`)}</p></div>
            </div>
            {content}
          </section>
        ))}
      </div>
    </div>
  );
}

export { PreferencesPage };
