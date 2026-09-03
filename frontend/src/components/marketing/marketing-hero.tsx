import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/global/brand/brand-mark";
import { Button } from "@/components/global/primitives/button";
import { Link } from "@/i18n/navigation";

async function MarketingHero() {
  const t = await getTranslations("Home");

  return (
    <section className="pt-12 pb-3 sm:pt-16 sm:pb-4">
      <div className="page-container flex flex-col items-center justify-center text-center">
        <BrandMark className="h-32 w-32 sm:h-36 sm:w-36 lg:h-40 lg:w-40" />

        <h1 className="mt-7 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>

        <p className="mt-1 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {t("description")}
        </p>

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Button asChild size="large">
            <Link href="/register">{t("primaryAction")}</Link>
          </Button>

          <Button asChild size="large" variant="secondary">
            <Link href="#how-it-works">
              {t("secondaryAction")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export { MarketingHero };
