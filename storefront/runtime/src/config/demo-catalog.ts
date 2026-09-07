import type { StorefrontProductListing } from "@/types/storefront";

export const demoStorefrontProducts: StorefrontProductListing[] = [
  {
    id: "demo-listing-iphone-16",
    slug: "iphone-16",
    brand: "Apple",
    badge: { en: "New", sw: "Mpya" },
    title: { en: "iPhone 16", sw: "iPhone 16" },
    shortDescription: {
      en: "A grouped storefront listing backed by exact color and storage SKUs.",
      sw: "Bidhaa moja ya dukani inayounganisha SKU halisi za rangi na hifadhi.",
    },
    description: {
      en: "Choose the color and storage you want. Every selectable combination maps to a specific Tunakuza Commerce product identity instead of a visual-only option.",
      sw: "Chagua rangi na hifadhi unayotaka. Kila mchanganyiko unaochaguliwa unaunganishwa na bidhaa maalum ya Tunakuza Commerce badala ya kuwa chaguo la muonekano pekee.",
    },
    primaryImageUrl: "/products/iphone-16-black.webp",
    options: [
      {
        id: "color",
        name: { en: "Color", sw: "Rangi" },
        values: [
          { value: "black", label: { en: "Black", sw: "Nyeusi" }, colorHex: "#1f2022" },
          { value: "blue", label: { en: "Blue", sw: "Bluu" }, colorHex: "#9fb9d0" },
          { value: "pink", label: { en: "Pink", sw: "Pinki" }, colorHex: "#e9c3c6" },
        ],
      },
      {
        id: "storage",
        name: { en: "Storage", sw: "Hifadhi" },
        values: [
          { value: "128gb", label: { en: "128 GB", sw: "GB 128" } },
          { value: "256gb", label: { en: "256 GB", sw: "GB 256" } },
        ],
      },
    ],
    skus: [
      {
        id: "demo-sku-iphone-16-black-128",
        commerceProductId: "demo-commerce-iphone-16-black-128",
        sku: "IP16-BLK-128",
        options: { color: "black", storage: "128gb" },
        price: { amount: "2150000", currency: "TZS" },
        availability: "in_stock",
        imageUrl: "/products/iphone-16-black.webp",
      },
      {
        id: "demo-sku-iphone-16-black-256",
        commerceProductId: "demo-commerce-iphone-16-black-256",
        sku: "IP16-BLK-256",
        options: { color: "black", storage: "256gb" },
        price: { amount: "2450000", currency: "TZS" },
        availability: "low_stock",
        imageUrl: "/products/iphone-16-black.webp",
      },
      {
        id: "demo-sku-iphone-16-blue-128",
        commerceProductId: "demo-commerce-iphone-16-blue-128",
        sku: "IP16-BLU-128",
        options: { color: "blue", storage: "128gb" },
        price: { amount: "2150000", currency: "TZS" },
        availability: "in_stock",
        imageUrl: "/products/iphone-16-blue.webp",
      },
      {
        id: "demo-sku-iphone-16-pink-128",
        commerceProductId: "demo-commerce-iphone-16-pink-128",
        sku: "IP16-PNK-128",
        options: { color: "pink", storage: "128gb" },
        price: { amount: "2150000", currency: "TZS" },
        availability: "in_stock",
        imageUrl: "/products/iphone-16-pink.webp",
      },
      {
        id: "demo-sku-iphone-16-pink-256",
        commerceProductId: "demo-commerce-iphone-16-pink-256",
        sku: "IP16-PNK-256",
        options: { color: "pink", storage: "256gb" },
        price: { amount: "2450000", currency: "TZS" },
        availability: "out_of_stock",
        imageUrl: "/products/iphone-16-pink.webp",
      },
    ],
  },
  {
    id: "demo-listing-galaxy-s24-ultra",
    slug: "galaxy-s24-ultra",
    brand: "Samsung",
    badge: { en: "Popular", sw: "Maarufu" },
    title: { en: "Galaxy S24 Ultra", sw: "Galaxy S24 Ultra" },
    shortDescription: {
      en: "Premium Android hardware with exact public SKU availability.",
      sw: "Simu ya Android ya kiwango cha juu yenye upatikanaji wa SKU halisi.",
    },
    description: {
      en: "This listing demonstrates how one customer-facing product can group several operational Commerce SKUs while keeping price and availability tied to the chosen combination.",
      sw: "Bidhaa hii inaonyesha jinsi bidhaa moja inayoonekana kwa mteja inaweza kuunganisha SKU kadhaa za Commerce huku bei na upatikanaji vikifuata chaguo lililochaguliwa.",
    },
    primaryImageUrl: "/products/galaxy-s24-ultra-black.webp",
    options: [
      {
        id: "color",
        name: { en: "Color", sw: "Rangi" },
        values: [
          { value: "black", label: { en: "Titanium Black", sw: "Titanium Nyeusi" }, colorHex: "#3b3b3c" },
          { value: "violet", label: { en: "Titanium Violet", sw: "Titanium Zambarau" }, colorHex: "#8b8194" },
        ],
      },
      {
        id: "storage",
        name: { en: "Storage", sw: "Hifadhi" },
        values: [
          { value: "256gb", label: { en: "256 GB", sw: "GB 256" } },
          { value: "512gb", label: { en: "512 GB", sw: "GB 512" } },
        ],
      },
    ],
    skus: [
      {
        id: "demo-sku-s24u-black-256",
        commerceProductId: "demo-commerce-s24u-black-256",
        sku: "S24U-BLK-256",
        options: { color: "black", storage: "256gb" },
        price: { amount: "2850000", currency: "TZS" },
        availability: "in_stock",
        imageUrl: "/products/galaxy-s24-ultra-black.webp",
      },
      {
        id: "demo-sku-s24u-black-512",
        commerceProductId: "demo-commerce-s24u-black-512",
        sku: "S24U-BLK-512",
        options: { color: "black", storage: "512gb" },
        price: { amount: "3150000", currency: "TZS" },
        availability: "low_stock",
        imageUrl: "/products/galaxy-s24-ultra-black.webp",
      },
      {
        id: "demo-sku-s24u-violet-256",
        commerceProductId: "demo-commerce-s24u-violet-256",
        sku: "S24U-VIO-256",
        options: { color: "violet", storage: "256gb" },
        price: { amount: "2850000", currency: "TZS" },
        availability: "in_stock",
        imageUrl: "/products/galaxy-s24-ultra-violet.webp",
      },
    ],
  },
];
