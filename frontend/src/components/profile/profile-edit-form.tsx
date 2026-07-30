"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { ProfilePage } from "@/components/profile/profile-page";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useProfile } from "@/providers/profile/profile-provider";
import { createProfileFormSchema } from "@/schemas/profile/profile";
import { ApiClientError } from "@/services/global/api-client";
import type { ProfileUpdateValues } from "@/types/profile/profile";

function ProfileEditForm() {
  const t = useTranslations("ProfileEdit");
  const errorsT = useTranslations("IdentityErrors");
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();
  const { notify } = useNotification();
  const { personal, removeImage, save } = useProfile();
  const [removing, setRemoving] = useState(false);

  const schema = useMemo(
    () =>
      createProfileFormSchema({
        firstName: t("validation.firstName"),
        lastName: t("validation.lastName"),
        region: t("validation.region"),
        username: t("validation.username"),
      }),
    [t],
  );

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    watch,
  } = useForm<ProfileUpdateValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (personal) {
      reset({
        countryCode: personal.country_code as "KE" | "TZ" | "UG",
        firstName: personal.first_name,
        lastName: personal.last_name,
        region: personal.region,
        username: personal.username ?? "",
      });
    }
  }, [personal, reset]);

  const selectedImage = watch("profileImage")?.item(0);
  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const onSubmit = handleSubmit(async (values) => {
    const image = values.profileImage?.item(0);
    if (image && image.size > 5 * 1024 * 1024) {
      setError("profileImage", { message: t("validation.imageSize") });
      return;
    }
    if (
      image &&
      !["image/jpeg", "image/png", "image/webp"].includes(image.type)
    ) {
      setError("profileImage", { message: t("validation.imageType") });
      return;
    }

    try {
      await save(values);
      notify({ message: t("success"), tone: "success" });
    } catch (error) {
      if (error instanceof ApiClientError) {
        const fields = [
          ["firstName", "first_name"],
          ["lastName", "last_name"],
          ["username", "username"],
          ["countryCode", "country_code"],
          ["region", "region"],
          ["profileImage", "profile_image"],
        ] as const;
        fields.forEach(([formField, apiField]) => {
          const issue = firstFieldIssue(error.details.fieldErrors, apiField);
          if (issue) {
            setError(formField, { message: getFieldMessage(issue) });
          }
        });
        notify({ message: getErrorMessage(error.details), tone: "error" });
        return;
      }
      notify({ message: errorsT("unexpected_error"), tone: "error" });
    }
  });

  const handleRemoveImage = async () => {
    setRemoving(true);
    try {
      await removeImage();
      notify({ message: t("imageRemoved"), tone: "success" });
    } catch (error) {
      notify({
        message:
          error instanceof ApiClientError
            ? getErrorMessage(error.details)
            : errorsT("unexpected_error"),
        tone: "error",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <ProfilePage description={t("description")} title={t("title")}>
      {personal ? (
        <form className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6" onSubmit={onSubmit}>
          <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
            <span
              className="size-24 shrink-0 rounded-full bg-slate-100 bg-cover bg-center dark:bg-slate-900"
              style={{
                backgroundImage: previewUrl
                  ? `url("${previewUrl}")`
                  : personal.profile_image_url
                    ? `url("${personal.profile_image_url}")`
                    : undefined,
              }}
            />
            <div>
              <FormField
                description={t("imageHelp")}
                error={errors.profileImage?.message?.toString()}
                htmlFor="profile-image"
                label={t("fields.image")}
              >
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  className="h-auto py-2"
                  id="profile-image"
                  type="file"
                  {...register("profileImage")}
                />
              </FormField>
              {personal.profile_image_url ? (
                <Button
                  className="mt-3"
                  loading={removing}
                  onClick={() => void handleRemoveImage()}
                  size="small"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                  {t("removeImage")}
                </Button>
              ) : null}
            </div>
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField error={errors.firstName?.message} htmlFor="profile-first-name" label={t("fields.firstName")} required>
              <Input id="profile-first-name" invalid={Boolean(errors.firstName)} {...register("firstName")} />
            </FormField>
            <FormField error={errors.lastName?.message} htmlFor="profile-last-name" label={t("fields.lastName")} required>
              <Input id="profile-last-name" invalid={Boolean(errors.lastName)} {...register("lastName")} />
            </FormField>
            <FormField error={errors.username?.message} htmlFor="profile-username" label={t("fields.username")} required>
              <Input autoComplete="username" id="profile-username" invalid={Boolean(errors.username)} {...register("username")} />
            </FormField>
            <FormField error={errors.countryCode?.message} htmlFor="profile-country" label={t("fields.country")} required>
              <Select id="profile-country" invalid={Boolean(errors.countryCode)} {...register("countryCode")}>
                <option value="TZ">{t("countries.TZ")}</option>
                <option value="KE">{t("countries.KE")}</option>
                <option value="UG">{t("countries.UG")}</option>
              </Select>
            </FormField>
            <FormField className="sm:col-span-2" error={errors.region?.message} htmlFor="profile-region" label={t("fields.region")}>
              <Input id="profile-region" invalid={Boolean(errors.region)} {...register("region")} />
            </FormField>
          </div>

          <div className="flex justify-end">
            <Button loading={isSubmitting} loadingLabel={t("saving")} type="submit">
              <ImageUp className="size-4" />
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}
    </ProfilePage>
  );
}

export { ProfileEditForm };
