import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Règle prévue pour le routeur « pages » : ici les polices sont chargées
      // dans le layout racine de l'App Router, donc sur toutes les pages.
      "@next/next/no-page-custom-font": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "reference/**", "supabase/**", "next-env.d.ts"]),
]);
