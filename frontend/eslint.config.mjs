import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // These workspace components perform initial API synchronization through
  // an async loader invoked by an effect. State updates happen after awaited
  // network work, not synchronously in the effect body, but the React rule
  // currently flags the loader invocation itself.
  {
    files: [
      "src/components/commerce/financing/financing-workspace.tsx",
      "src/components/commerce/sales/sales-workspace.tsx",
      "src/components/commerce/stock/stock-progressive-workspace.tsx",
      "src/components/commerce/stock/stock-progressive-workspace-v2.tsx",
      "src/components/commerce/stock/stock-recording-workspace-v2.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Website manager previews render arbitrary merchant-uploaded media URLs.
  // Keep them as plain img elements so preview rendering does not depend on
  // Next Image remote-host allowlists or optimization infrastructure.
  {
    files: [
      "src/components/website/website-homepage-header-manager.tsx",
      "src/components/website/website-homepage-hero-manager.tsx",
      "src/components/website/website-homepage-featured-products-manager.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
