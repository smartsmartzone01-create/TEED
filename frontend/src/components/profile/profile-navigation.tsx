"use client";

import { Contact, Pencil, UserRound, View } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";

const profileLinks = [
  { href: "/dashboard/profile", icon: View, key: "overview" },
  {
    href: "/dashboard/profile/personal",
    icon: UserRound,
    key: "personal",
  },
  { href: "/dashboard/profile/edit", icon: Pencil, key: "edit" },
  {
    href: "/dashboard/profile/contacts",
    icon: Contact,
    key: "contacts",
  },
] as const;

function ProfileNavigation() {
  const pathname = usePathname();
  const t = useTranslations("ProfileNavigation");

  return (
    <nav
      aria-label={t("label")}
      className="grid grid-cols-2 gap-2 lg:hidden"
    >
      {profileLinks.map(({ href, icon: Icon, key }) => {
        const active =
          href === "/dashboard/profile"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
              active
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300",
            )}
            href={href}
            key={key}
          >
            <Icon className="size-4" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}

export { ProfileNavigation, profileLinks };
