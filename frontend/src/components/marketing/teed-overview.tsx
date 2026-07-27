import { getTranslations } from "next-intl/server";

async function TeedOverview() {
  const t = await getTranslations("TeedOverview");

  const pillars = [
    {
      title: t("manage.title"),
      description: t("manage.description"),
    },
    {
      title: t("market.title"),
      description: t("market.description"),
    },
    {
      title: t("analyze.title"),
      description: t("analyze.description"),
    },
    {
      title: t("learn.title"),
      description: t("learn.description"),
    },
    {
      title: t("build.title"),
      description: t("build.description"),
    },
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="teed-overview-title"
      className="page-section scroll-mt-24 bg-background"
    >
      <div className="page-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-orange-accessible">
            {t("eyebrow")}
          </p>

          <h2
            id="teed-overview-title"
            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            {t("title")}
          </h2>

          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pillars.map((pillar, index) => (
            <li
              key={pillar.title}
              className="rounded-2xl border border-border/80 bg-background/70 p-6 backdrop-blur-sm"
            >
              <p
                aria-hidden="true"
                className="text-sm font-semibold text-brand-orange-accessible"
              >
                {String(index + 1).padStart(2, "0")}
              </p>

              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {pillar.title}
              </h3>

              <p className="mt-3 leading-7 text-muted-foreground">
                {pillar.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { TeedOverview };