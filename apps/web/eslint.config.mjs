import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/notifications.ts", "src/components/ui/sonner.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "sonner",
          importNames: ["toast"],
          message: "Use @/lib/notifications so every notification has a status icon, title and description.",
        }],
      }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
