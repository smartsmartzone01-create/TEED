"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { BusinessPage } from "@/components/workspace/business-page";
import { Button } from "@/components/global/primitives/button";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { isRequestCancelled } from "@/services/global/api-client";
import type { BusinessSettingsData, BusinessSettingsValues } from "@/types/workspace/workspace";

function BusinessSettings({ businessId }: { businessId: string }) {
  const t = useTranslations("BusinessSettings");
  const { loadSettings, saveSettings } = useWorkspace();
  const { notify } = useNotification();
  const [data, setData] = useState<BusinessSettingsData | null>(null);
  const [values, setValues] = useState<BusinessSettingsValues | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void loadSettings(businessId, controller.signal)
      .then((result) => {
        setData(result);
        setValues({ brandingEnabled: result.settings.branding_enabled, dateFormat: result.settings.date_format, discoverable: result.settings.is_discoverable, languageCode: result.settings.language_code, timeFormat: result.settings.time_format, timezone: result.settings.timezone });
      })
      .catch((error) => {
        if (!isRequestCancelled(error)) notify({ message: t("loadError"), tone: "error" });
      });
    return () => controller.abort();
  }, [businessId, loadSettings, notify, t]);

  if (!data || !values) return <p className="text-sm text-slate-500">{t("loading")}</p>;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { setData(await saveSettings(businessId, values)); notify({ message: t("saved"), tone: "success" }); }
    catch { notify({ message: t("saveError"), tone: "error" }); }
    finally { setSaving(false); }
  };

  return <BusinessPage description={t("description")} eyebrow={t("eyebrow")} title={t("title")}>
    <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">{t("language")}<Select disabled={!data.can_manage} onChange={(e) => setValues({ ...values, languageCode: e.target.value as BusinessSettingsValues["languageCode"] })} value={values.languageCode}><option value="en">English</option><option value="sw">Kiswahili</option></Select></label>
        <label className="grid gap-2 text-sm font-medium">{t("timezone")}<Select disabled={!data.can_manage} onChange={(e) => setValues({ ...values, timezone: e.target.value as BusinessSettingsValues["timezone"] })} value={values.timezone}><option value="Africa/Dar_es_Salaam">Africa/Dar es Salaam</option><option value="Africa/Nairobi">Africa/Nairobi</option><option value="Africa/Kampala">Africa/Kampala</option><option value="UTC">UTC</option></Select></label>
        <label className="grid gap-2 text-sm font-medium">{t("dateFormat")}<Select disabled={!data.can_manage} onChange={(e) => setValues({ ...values, dateFormat: e.target.value as BusinessSettingsValues["dateFormat"] })} value={values.dateFormat}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select></label>
        <label className="grid gap-2 text-sm font-medium">{t("timeFormat")}<Select disabled={!data.can_manage} onChange={(e) => setValues({ ...values, timeFormat: e.target.value as BusinessSettingsValues["timeFormat"] })} value={values.timeFormat}><option value="12h">12 hour</option><option value="24h">24 hour</option></Select></label>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><input checked={values.discoverable} disabled={!data.can_manage} onChange={(e) => setValues({ ...values, discoverable: e.target.checked })} type="checkbox" /><span><strong className="block text-sm">{t("discoverable")}</strong><small className="text-slate-500">{t("discoverableHelp")}</small></span></label>
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><input checked={values.brandingEnabled} disabled={!data.can_manage} onChange={(e) => setValues({ ...values, brandingEnabled: e.target.checked })} type="checkbox" /><span><strong className="block text-sm">{t("branding")}</strong><small className="text-slate-500">{t("brandingHelp")}</small></span></label>
      {data.can_manage ? <Button loading={saving} type="submit"><Save className="size-4" />{t("save")}</Button> : <p className="text-sm text-slate-500">{t("readOnly")}</p>}
    </form>
  </BusinessPage>;
}

export { BusinessSettings };
