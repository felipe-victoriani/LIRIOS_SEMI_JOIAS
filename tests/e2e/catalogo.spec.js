import { test, expect } from "@playwright/test";

// A grade de produtos vem do Firebase Realtime Database (ver js/catalogo.js), então
// "adicionar pelo card" só é testável fim-a-fim com um projeto Firebase real configurado
// em js/firebase-config.js. Aqui testamos o que já funciona sem depender disso:
// a home carrega, e o carrinho + checkout por WhatsApp funcionam a partir do estado salvo.

test("home carrega com o essencial da marca visível", async ({ page }) => {
  // domcontentloaded (não "load"): o vídeo de fundo é pesado e não precisa terminar de
  // baixar pro teste de DOM/carrinho funcionar — esperar "load" deixa o teste lento e instável.
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Lírio Semijoias/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("essência");
  await expect(page.getByRole("link", { name: "Ver catálogo" })).toBeVisible();
});

test("sacola vazia mostra estado vazio e botão de finalizar desabilitado", async ({ page }) => {
  // domcontentloaded (não "load"): o vídeo de fundo é pesado e não precisa terminar de
  // baixar pro teste de DOM/carrinho funcionar — esperar "load" deixa o teste lento e instável.
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Abrir sacola" }).click();

  await expect(page.getByText("Sua sacola está vazia.")).toBeVisible();
  await expect(page.locator("#botao-finalizar")).toHaveAttribute("aria-disabled", "true");
});

test("fluxo principal: item salvo no carrinho aparece na sacola e monta o link certo do WhatsApp", async ({ page }) => {
  // Nome propositalmente diferente de qualquer peça de PRODUTOS_EXEMPLO (js/catalogo.js) —
  // o catálogo mostra exemplos enquanto não há Firebase configurado, e um nome igual ao de
  // um produto de exemplo faria "getByText"/"getByRole" baterem em dois elementos da página
  // (o card do catálogo e o item da sacola) em vez de só no da sacola.
  await page.addInitScript(() => {
    const carrinho = [
      { id: "p1", nome: "Item de Teste E2E", preco: 49.9, categoria: "Brincos", quantidade: 2 },
    ];
    window.localStorage.setItem("lirio:carrinho", JSON.stringify(carrinho));
  });

  // domcontentloaded (não "load"): o vídeo de fundo é pesado e não precisa terminar de
  // baixar pro teste de DOM/carrinho funcionar — esperar "load" deixa o teste lento e instável.
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Abrir sacola" }).click();

  const painelCarrinho = page.locator("#painel-carrinho");
  await expect(painelCarrinho.getByText("Item de Teste E2E")).toBeVisible();
  await expect(page.locator("#subtotal-carrinho")).toHaveText("R$ 99,80");

  const botaoFinalizar = page.locator("#botao-finalizar");
  await expect(botaoFinalizar).toHaveAttribute("aria-disabled", "false");

  const href = await botaoFinalizar.getAttribute("href");
  expect(href).toContain("https://api.whatsapp.com/send");
  expect(href).not.toContain("wa.me");
  // new URL().searchParams decodifica "+" como espaço corretamente (decodeURIComponent cru não decodifica).
  const textoMensagem = new URL(href).searchParams.get("text");
  expect(textoMensagem).toContain("2x Item de Teste E2E");

  // aumenta a quantidade pelo stepper e confere que o subtotal recalcula
  await painelCarrinho.getByRole("button", { name: "Aumentar quantidade de Item de Teste E2E" }).click();
  await expect(page.locator("#subtotal-carrinho")).toHaveText("R$ 149,70");

  // esvazia a sacola e confere que volta ao estado vazio
  await page.getByRole("button", { name: "Esvaziar sacola" }).click();
  await expect(page.getByText("Sua sacola está vazia.")).toBeVisible();
  await expect(botaoFinalizar).toHaveAttribute("aria-disabled", "true");
});
