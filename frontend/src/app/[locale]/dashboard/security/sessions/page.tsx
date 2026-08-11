import { setRequestLocale } from "next-intl/server";
import { SessionsDevices } from "@/components/security/sessions-devices";
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;setRequestLocale(locale);return <SessionsDevices/>}
