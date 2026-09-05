import Image from "next/image";

import { localized } from "@/lib/localized";
import type { StorefrontSiteConfig } from "@/types/storefront";

export function ServicesSection({ site }: { site: StorefrontSiteConfig }) {
  const locale = site.defaultLocale;

  return (
    <section id="services" className="page-shell services-section">
      {site.services.map((service, index) => (
        <article key={service.id} className={`service-card ${index % 2 ? "service-card-reverse" : ""}`}>
          <div className="service-copy">
            <p className="eyebrow">{locale === "sw" ? "Huduma" : "Service"}</p>
            <h2>{localized(service.title, locale)}</h2>
            <p>{localized(service.description, locale)}</p>
          </div>
          {service.imageUrl ? (
            <div className="service-media">
              <Image src={service.imageUrl} alt="" width={1200} height={800} />
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}
