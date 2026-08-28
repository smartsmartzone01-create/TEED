"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { BusinessPage } from "@/components/workspace/business-page";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { ApiClientError, isRequestCancelled } from "@/services/global/api-client";
import type {
  BusinessProfileData,
  BusinessProfileValues,
  WorkspaceType,
} from "@/types/workspace/workspace";
import { workspaceClassForType } from "@/utils/workspace/workspace-class";

type Section = "brand" | "information" | "operations";

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function BusinessProfileEditor({
  businessId,
  section,
}: {
  businessId: string;
  section: Section;
}) {
  const t = useTranslations("BusinessProfile");
  const classT = useTranslations("WorkspaceRefinement.create");
  const { loadProfile, saveProfile } = useWorkspace();
  const { notify } = useNotification();
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [values, setValues] = useState<Partial<BusinessProfileValues>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(businessId, controller.signal)
      .then((result) => {
        setData(result);
        setValues({
          address: result.profile.address,
          city: result.profile.city,
          countryCode: result.business.country_code,
          businessCategory: result.profile.business_category,
          name: result.business.name,
          operatingModel: result.profile.operating_model,
          primaryBrandColor: result.profile.primary_brand_color,
          publicHandle: result.business.public_handle,
          region: result.profile.region,
          secondaryBrandColor: result.profile.secondary_brand_color,
          workspaceType: result.business.workspace_type,
        });
      })
      .catch((error) => {
        if (!isRequestCancelled(error)) {
          notify({ message: t("loadError"), tone: "error" });
        }
      });
    return () => controller.abort();
  }, [businessId, loadProfile, notify, t]);

  const update = (key: keyof BusinessProfileValues, value: string | File) =>
    setValues((current) => ({ ...current, [key]: value }));

  const updateWorkspaceClass = (workspaceClass: "business" | "personal") => {
    const currentType = (values.workspaceType ?? data?.business.workspace_type ?? "business") as WorkspaceType;
    const nextType: WorkspaceType =
      workspaceClass === "personal"
        ? "personal_brand"
        : currentType === "service"
          ? "service"
          : "business";
    update("workspaceType", nextType);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveProfile(businessId, values);
      setData(result);
      setValues((current) => ({
        ...current,
        workspaceType: result.business.workspace_type,
      }));
      notify({ message: t("saved"), tone: "success" });
    } catch (error) {
      const logoIssue =
        error instanceof ApiClientError
          ? firstFieldIssue(error.details.fieldErrors, "logo")
          : undefined;
      notify({
        message:
          logoIssue?.message ??
          (error instanceof ApiClientError ? error.details.message : t("saveError")),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <p className="text-sm text-slate-500">{t("loading")}</p>;

  const currentWorkspaceClass = workspaceClassForType(
    (values.workspaceType ?? data.business.workspace_type) as WorkspaceType,
  );

  return (
    <BusinessPage
      description={t(`${section}.description`)}
      eyebrow={t("eyebrow")}
      title={t(`${section}.title`)}
    >
      <form
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"
        onSubmit={submit}
      >
        {section === "information" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.name")}>
                <Input
                  disabled={!data.can_manage}
                  onChange={(event) => update("name", event.target.value)}
                  required
                  value={values.name ?? ""}
                />
              </Field>
              <Field label={t("fields.handle")}>
                <Input
                  disabled={!data.can_manage}
                  onChange={(event) => update("publicHandle", event.target.value)}
                  required
                  value={values.publicHandle ?? ""}
                />
              </Field>
              <Field label={classT("class")}>
                <Select
                  disabled={!data.can_manage}
                  onChange={(event) =>
                    updateWorkspaceClass(event.target.value as "business" | "personal")
                  }
                  value={currentWorkspaceClass}
                >
                  <option value="business">{classT("business.title")}</option>
                  <option value="personal">{classT("personal.title")}</option>
                </Select>
                <span className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                  {classT(`${currentWorkspaceClass}.description`)}
                </span>
              </Field>
              <Field label={t("fields.country")}>
                <Select
                  disabled={!data.can_manage}
                  onChange={(event) => update("countryCode", event.target.value)}
                  value={values.countryCode}
                >
                  <option value="TZ">Tanzania</option>
                  <option value="KE">Kenya</option>
                  <option value="UG">Uganda</option>
                </Select>
              </Field>
              <Field label={t("fields.businessCategory")}>
                <Select
                  disabled={!data.can_manage}
                  onChange={(event) => update("businessCategory", event.target.value)}
                  value={values.businessCategory}
                >
                  <option value="">{t("categories.notSet")}</option>
                  {[
                    "retail_commerce",
                    "food_hospitality",
                    "professional_services",
                    "health_wellness",
                    "education_training",
                    "technology_digital",
                    "creative_media",
                    "manufacturing_agriculture",
                    "nonprofit_community",
                    "other",
                  ].map((category) => (
                    <option key={category} value={category}>
                      {t(`categories.${category}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("fields.logo")}>
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!data.can_manage}
                  onChange={(event) => {
                    const file = event.target.files?.item(0);
                    if (file) update("logo", file);
                  }}
                  type="file"
                />
              </Field>
            </div>
            <p className="text-xs text-slate-500">{t("handleNotice")}</p>
          </>
        ) : null}

        {section === "brand" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.primaryColor")}>
                <Input
                  disabled={!data.can_manage}
                  onChange={(event) => update("primaryBrandColor", event.target.value)}
                  type="color"
                  value={values.primaryBrandColor ?? "#0B1F3A"}
                />
              </Field>
              <Field label={t("fields.secondaryColor")}>
                <Input
                  disabled={!data.can_manage}
                  onChange={(event) => update("secondaryBrandColor", event.target.value)}
                  type="color"
                  value={values.secondaryBrandColor ?? "#F97316"}
                />
              </Field>
            </div>
            <div
              className="overflow-hidden rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
              style={{
                background: `linear-gradient(120deg, ${values.primaryBrandColor} 0 58%, ${values.secondaryBrandColor} 58%)`,
              }}
            >
              <div className="max-w-sm rounded-xl bg-white/95 p-4 text-slate-950 shadow-sm">
                <p className="font-semibold">{data.business.name}</p>
                <p className="mt-1 text-xs text-slate-600">{t("brand.preview")}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{t("brand.scope")}</p>
          </>
        ) : null}

        {section === "operations" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("fields.operatingModel")}>
              <Select
                disabled={!data.can_manage}
                onChange={(event) => update("operatingModel", event.target.value)}
                value={values.operatingModel}
              >
                <option value="">{t("operations.notSet")}</option>
                <option value="physical">{t("operations.physical")}</option>
                <option value="online">{t("operations.online")}</option>
                <option value="hybrid">{t("operations.hybrid")}</option>
              </Select>
            </Field>
            <Field label={t("fields.region")}>
              <Input
                disabled={!data.can_manage}
                onChange={(event) => update("region", event.target.value)}
                value={values.region ?? ""}
              />
            </Field>
            <Field label={t("fields.city")}>
              <Input
                disabled={!data.can_manage}
                onChange={(event) => update("city", event.target.value)}
                value={values.city ?? ""}
              />
            </Field>
            <Field label={t("fields.address")}>
              <Input
                disabled={!data.can_manage}
                onChange={(event) => update("address", event.target.value)}
                value={values.address ?? ""}
              />
            </Field>
          </div>
        ) : null}

        {data.can_manage ? (
          <Button loading={saving} type="submit">
            <Save className="size-4" />
            {t("save")}
          </Button>
        ) : (
          <p className="text-sm text-slate-500">{t("readOnly")}</p>
        )}
      </form>
    </BusinessPage>
  );
}

export { BusinessProfileEditor };
