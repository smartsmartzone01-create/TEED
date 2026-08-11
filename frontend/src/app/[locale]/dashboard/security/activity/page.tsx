import { setRequestLocale } from "next-intl/server";
import { SecurityActivity } from "@/components/security/security-activity";
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;setRequestLocale(locale);return <SecurityActivity/>}
