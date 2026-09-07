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
  navigation: [
    { id: "home", label: { en: "Home", sw: "Nyumbani" }, href: "/" },
    { id: "products", label: { en: "Shop", sw: "Duka" }, href: "/products" },
    { id: "services", label: { en: "Services", sw: "Huduma" }, href: "/#services" },
    { id: "about", label: { en: "About", sw: "Kuhusu" }, href: "/#about" },
  ],
  hero: {
    eyebrow: { en: "Built for your business", sw: "Imeundwa kwa biashara yako" },
    title: { en: "Your next customer starts here", sw: "Mteja wako anayefuata anaanzia hapa" },
    subtitle: {
      en: "A fast, focused storefront powered by your Tunakuza business data.",
      sw: "Duka la mtandaoni lenye kasi linalotumia taarifa za biashara yako ya Tunakuza.",
    },
    primaryAction: { en: "Explore the store", sw: "Tembelea duka" },
    primaryHref: "/products",
    secondaryAction: { en: "Learn more", sw: "Jifunze zaidi" },
    secondaryHref: "/#about",
    imageUrl: "/images/hello1.webp",
  },
  services: [
    {
      id: "delivery",
      title: { en: "Fast delivery", sw: "Uwasilishaji wa haraka" },
      description: {
        en: "Give customers clear fulfillment options without hardcoding one merchant's process into the template.",
        sw: "Waonyeshe wateja chaguo za uwasilishaji bila kufunga mfumo kwa mchakato wa mfanyabiashara mmoja.",
      },
      imageUrl: "/images/services2.webp",
    },
    {
      id: "shopping",
      title: { en: "Simple shopping", sw: "Ununuzi rahisi" },
      description: {
        en: "Keep the focused navigation and product-first experience from the original storefront while making the content configurable.",
        sw: "Hifadhi urahisi wa urambazaji wa duka la awali huku maudhui yakibadilishwa kulingana na biashara.",
      },
      imageUrl: "/images/services3.jpg",
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
