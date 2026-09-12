import {
  Globe2,
  Grid2X2,
  ImagePlus,
  LayoutDashboard,
  Palette,
  Settings2,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";

type WebsiteHomepageManagerProps = {
  locale: string;
};

type HomepageSection = {
  description: string;
  icon: LucideIcon;
  title: string;
};

function WebsiteHomepageManager({ locale }: WebsiteHomepageManagerProps) {
  const sw = locale === "sw";

  const sections: HomepageSection[] = [
    {
      description: sw
        ? "Nembo, viungo vya urambazaji na vipengele vya kichwa vinavyoonekana kwa wateja."
        : "Logo, navigation links, and customer-facing header controls.",
      icon: Store,
      title: sw ? "Kichwa" : "Header",
    },
    {
      description: sw
        ? "Kichwa kikuu, maelezo, vitufe vya mwito na picha kuu ya ukurasa wa mwanzo."
        : "Headline, supporting copy, calls to action, and the main hero artwork.",
      icon: ImagePlus,
      title: sw ? "Sehemu kuu" : "Hero",
    },
    {
      description: sw
        ? "Bidhaa maarufu zitakazochaguliwa kiotomatiki au kwa mkono kwa ukurasa wa mwanzo."
        : "Popular products that can later be selected automatically or manually for the homepage.",
      icon: ShoppingBag,
      title: sw ? "Chaguo maarufu" : "Popular picks",
    },
    {
      description: sw
        ? "Njia za haraka za kwenda kwenye makundi muhimu ya bidhaa na sehemu za ugunduzi."
        : "Shortcuts to important product categories and discovery sections.",
      icon: Grid2X2,
      title: sw ? "Makundi" : "Categories",
    },
    {
      description: sw
        ? "Mabango ya kampeni, ujumbe wa ofa na maeneo mengine ya matangazo."
        : "Campaign banners, promotional messages, and other merchandising moments.",
      icon: Palette,
      title: sw ? "Matangazo" : "Promotions",
    },
    {
      description: sw
        ? "Mawasiliano, usaidizi, sera, mitandao ya kijamii na viungo vya mwisho vya tovuti."
        : "Contact, support, policy, social, and other customer-facing footer links.",
      icon: Settings2,
      title: sw ? "Sehemu ya chini" : "Footer",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Website
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
            {sw ? "Ukurasa wa mwanzo" : "Homepage"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {sw
              ? "Panga na simamia sehemu ambazo mteja anaona kwanza kwenye tovuti yako. Tutakamilisha sehemu moja baada ya nyingine bila kuvuruga muundo wa template."
              : "Shape and manage what customers see first on your website. We will finish one section at a time without breaking the template structure."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <Globe2 className="size-3.5" />
            Classic e-commerce
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
            {sw ? "Mpangilio wa mwanzo" : "Homepage setup"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Palette className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              {sw ? "Muonekano wa chapa" : "Brand appearance"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {sw
                ? "Tovuti itaanza kwa kurithi rangi na utambulisho wa workspace. Baadaye tutaongeza chaguo salama za kubadilisha muonekano wa tovuti pekee."
                : "The website will start by inheriting the workspace brand identity. Later we will add safe website-specific overrides without turning this into a free-form page builder."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {sw ? "Chanzo" : "Source"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {sw ? "Chapa ya workspace" : "Workspace branding"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Template
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              Classic e-commerce
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {sw ? "Mkazo" : "Focus"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {sw ? "Ukurasa wa mwanzo pekee" : "Homepage only"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                {sw ? "Sehemu za ukurasa" : "Homepage sections"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {sw
                  ? "Tutasanidi kila sehemu hapa kulingana na muundo wa storefront."
                  : "Each section will be configured here to match the storefront design."}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-400">
              {sections.length} {sw ? "sehemu" : "sections"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <article
                  className="flex gap-4 border-b border-slate-200 p-4 last:border-b-0 dark:border-slate-800 sm:p-5"
                  key={section.title}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                        {section.title}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        {sw ? "Tayari kusanidi" : "Ready to configure"}
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {section.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                      <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>
                      <span className="h-px w-5 bg-slate-200 dark:bg-slate-800" />
                      <span>{sw ? "Mpangilio wa storefront" : "Storefront structure"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="self-start rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 xl:sticky xl:top-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                {sw ? "Ramani ya ukurasa" : "Page map"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {sw ? "Muundo, si preview halisi bado" : "Structure, not a live preview yet"}
              </p>
            </div>
            <LayoutDashboard className="size-4 text-slate-400" />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="ml-auto flex gap-1.5">
                  <span className="size-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <span className="size-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <span className="size-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            </div>
            <div className="space-y-3 p-3">
              <div className="h-28 rounded-md border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950" />
              <div>
                <div className="mb-2 h-2 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 rounded bg-white dark:bg-slate-950" />
                  <div className="h-14 rounded bg-white dark:bg-slate-950" />
                  <div className="h-14 rounded bg-white dark:bg-slate-950" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="h-7 rounded bg-white dark:bg-slate-950" />
                <div className="h-7 rounded bg-white dark:bg-slate-950" />
                <div className="h-7 rounded bg-white dark:bg-slate-950" />
                <div className="h-7 rounded bg-white dark:bg-slate-950" />
              </div>
              <div className="h-16 rounded-md border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950" />
              <div className="h-16 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <Settings2 className="mt-0.5 size-3.5 shrink-0" />
            <p>
              {sw
                ? "Kila control tutakayoongeza hapa itaunganishwa moja kwa moja na sehemu yake kwenye storefront."
                : "Each control we add here will map directly to its matching section in the storefront."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export { WebsiteHomepageManager };
