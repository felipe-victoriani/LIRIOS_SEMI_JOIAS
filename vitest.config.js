import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // tests/e2e roda só no Playwright (test:e2e) — misturar os dois runners quebra os dois.
    // database.rules.test.js roda só via `npm run test:regras` (precisa do emulador do Firebase).
    exclude: ["**/node_modules/**", "tests/e2e/**", "tests/database.rules.test.js"],
  },
});
