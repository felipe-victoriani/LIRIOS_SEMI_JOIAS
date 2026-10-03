// Testa database.rules.json contra o emulador do Firebase.
// Rodar com: npm run test:regras (precisa do Firebase CLI + Java instalados pro emulador).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "lirio-semijoias-teste",
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("regras de /produtos", () => {
  it("nega escrita de quem não está autenticado", async () => {
    const semAuth = testEnv.unauthenticatedContext().database();
    await assertFails(
      semAuth.ref("produtos/p1").set({ nome: "Anel", categoria: "Anéis", preco: 59.9 })
    );
  });

  it("permite escrita de um usuário autenticado (admin)", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    await assertSucceeds(
      comAuth.ref("produtos/p1").set({ nome: "Anel", categoria: "Anéis", preco: 59.9 })
    );
  });

  it("nega produto sem os campos obrigatórios (validação de schema)", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    await assertFails(comAuth.ref("produtos/p2").set({ nome: "Anel incompleto" }));
  });

  it("permite leitura pública do catálogo mesmo sem autenticação", async () => {
    const semAuth = testEnv.unauthenticatedContext().database();
    await assertSucceeds(semAuth.ref("produtos").get());
  });
});
