import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // These two workspace components perform initial API synchronization through
  // an async loader invoked by an effect. State updates happen after awaited
  // network work, not synchronously in the effect body, but the React rule
  // currently flags the loader invocation itself.
  {
    files: [
      "src/components/commerce/sales/sales-workspace.tsx",
      "src/components/commerce/stock/stock-progressive-workspace.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
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
