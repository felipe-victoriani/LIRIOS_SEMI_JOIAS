import { defineConfig } from "vitest/config";

// Config separada só pra tests/database.rules.test.js, que precisa do emulador do Firebase
// rodando (via `firebase emulators:exec`) — por isso fica fora do `npm test` padrão.
export default defineConfig({
  test: {
    include: ["tests/database.rules.test.js"],
  },
});
