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
      semAuth.ref("produtos/p1").set({ nome: "Anel", categoriaId: "c1", preco: 59.9 })
    );
  });

  it("permite escrita de um usuário autenticado (admin)", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    await assertSucceeds(
      comAuth.ref("produtos/p1").set({ nome: "Anel", categoriaId: "c1", preco: 59.9 })
    );
  });

  it("aceita fotosExtras de 0 a 2 e recusa mais que isso", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    const base = { nome: "Anel", categoriaId: "c1", preco: 59.9 };
    await assertSucceeds(comAuth.ref("produtos/p3").set({ ...base, fotosExtras: 2 }));
    await assertFails(comAuth.ref("produtos/p4").set({ ...base, fotosExtras: 3 }));
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

describe("regras de /fotos/galeria", () => {
  const FOTO = "data:image/webp;base64,AAAA";

  it("nega escrita de quem não está autenticado", async () => {
    const semAuth = testEnv.unauthenticatedContext().database();
    await assertFails(semAuth.ref("fotos/galeria/p1/1").set(FOTO));
  });

  it("permite as posições 1 e 2 para usuário autenticado", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    await assertSucceeds(comAuth.ref("fotos/galeria/p1/1").set(FOTO));
    await assertSucceeds(comAuth.ref("fotos/galeria/p1/2").set(FOTO));
  });

  it("recusa a terceira foto extra (limite de 3 fotos por peça)", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    await assertFails(comAuth.ref("fotos/galeria/p1/3").set(FOTO));
  });

  it("recusa conteúdo que não seja imagem", async () => {
    const comAuth = testEnv.authenticatedContext("admin-uid").database();
    await assertFails(comAuth.ref("fotos/galeria/p1/1").set("texto qualquer"));
  });

  it("permite leitura pública da galeria", async () => {
    const semAuth = testEnv.unauthenticatedContext().database();
    await assertSucceeds(semAuth.ref("fotos/galeria/p1").get());
  });
});
