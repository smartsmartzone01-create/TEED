import type { StorefrontSiteConfig } from "@/types/storefront";

export const demoStorefrontSite: StorefrontSiteConfig = {
  id: "preview-store",
  businessId: "preview-business",
  slug: "your-store",
  displayName: "Your Store",
  defaultLocale: "en",
  supportedLocales: ["en", "sw"],
  theme: {
    primaryColor: "#c56926",
    surfaceColor: "#ffffff",
    textColor: "#202020",
  },
  contact: {
    email: "hello@example.com",
  },
  header: {},
  navigation: [
    { id: "home", label: { en: "Home", sw: "Nyumbani" }, href: "/" },
    { id: "products", label: { en: "Shop", sw: "Duka" }, href: "/products" },
    { id: "services", label: { en: "Services", sw: "Huduma" }, href: "/#services" },
    { id: "about", label: { en: "About", sw: "Kuhusu" }, href: "/#about" },
  ],
  hero: {
    eyebrow: { en: "Built for your business", sw: "Imeundwa kwa biashara yako" },
    title: { en: "Your next upgrade starts here", sw: "Hatua yako inayofuata inaanzia hapa" },
    subtitle: {
      en: "Discover products, offers, and services in a storefront shaped around your brand.",
      sw: "Gundua bidhaa, ofa na huduma katika duka la mtandaoni linaloendana na chapa yako.",
    },
    primaryAction: { en: "Shop now", sw: "Nunua sasa" },
    primaryHref: "/products",
    secondaryAction: { en: "Learn more", sw: "Jifunze zaidi" },
    secondaryHref: "/#services",
    imageUrl: "/templates/ecommerce/classic/hero.webp",
  },
  services: [
    {
      id: "trade-in",
      title: { en: "Trade-In Program", sw: "Mpango wa Kubadilishana" },
      description: {
        en: "Help customers upgrade by trading in an older device and applying its value toward a new purchase.",
        sw: "Wasaidie wateja kuboresha vifaa vyao kwa kubadilisha kifaa cha zamani na kutumia thamani yake kwenye ununuzi mpya.",
      },
      imageUrl: "/templates/ecommerce/classic/service-1.webp",
    },
    {
      id: "delivery",
      title: { en: "Fast Delivery", sw: "Uwasilishaji wa Haraka" },
      description: {
        en: "Present clear delivery promises and fulfillment options in a way that fits the merchant's business.",
        sw: "Onyesha ahadi za uwasilishaji na chaguo za kufikisha bidhaa kwa namna inayolingana na biashara ya mfanyabiashara.",
      },
      imageUrl: "/templates/ecommerce/classic/service-2.webp",
    },
    {
      id: "shopping",
      title: { en: "Instant Shopping", sw: "Ununuzi wa Haraka" },
      description: {
        en: "Keep browsing focused and product-first, with a clear path from discovery to purchase.",
        sw: "Weka urambazaji ukiwa rahisi na unaolenga bidhaa, kutoka ugunduzi hadi ununuzi.",
      },
      imageUrl: "/templates/ecommerce/classic/service-3.jpg",
    },
    {
      id: "support",
      title: { en: "Expert Support", sw: "Msaada wa Wataalamu" },
      description: {
        en: "Highlight installation, repair, consultation, or after-sales help as part of the storefront experience.",
        sw: "Onyesha usakinishaji, matengenezo, ushauri au msaada baada ya mauzo kama sehemu ya uzoefu wa duka.",
      },
      imageUrl: "/templates/ecommerce/classic/service-4.webp",
    },
  ],
  newsletter: {
    enabled: true,
    title: { en: "Stay updated", sw: "Endelea kupata taarifa" },
    description: {
      en: "Receive new products, offers, and store updates.",
      sw: "Pata bidhaa mpya, ofa na taarifa za duka.",
    },
  },
};
