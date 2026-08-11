"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/global/primitives/button";
import { SecurityNavigation } from "@/components/security/security-navigation";
import { useSecurity } from "@/providers/security/security-provider";
function SecurityPage({title,description,children}:{title:string;description:string;children:ReactNode}){const t=useTranslations("SecurityCommon");const {loading,error,refresh}=useSecurity();return <div className="space-y-5"><SecurityNavigation/><header><p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p><h1 className="mt-2 text-2xl font-semibold">{title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p></header>{loading?<div className="rounded-2xl border p-6">{t("loading")}</div>:error?<div className="rounded-2xl border border-red-200 p-6"><p>{t("error")}</p><Button className="mt-3" onClick={()=>void refresh()}>{t("retry")}</Button></div>:children}</div>}
export {SecurityPage};
