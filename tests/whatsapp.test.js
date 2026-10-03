import { describe, it, expect } from "vitest";
import { montarLinkWhatsApp, montarMensagemPedido } from "../js/whatsapp.js";

describe("montarLinkWhatsApp", () => {
  it("usa sempre api.whatsapp.com/send, nunca wa.me", () => {
    const link = montarLinkWhatsApp("5567981884764", "oi");
    expect(link.startsWith("https://api.whatsapp.com/send?")).toBe(true);
    expect(link).not.toContain("wa.me");
  });

  it("inclui o telefone e o texto codificados na URL", () => {
    const link = montarLinkWhatsApp("5567981884764", "Olá, tudo bem?");
    const url = new URL(link);
    expect(url.searchParams.get("phone")).toBe("5567981884764");
    expect(url.searchParams.get("text")).toBe("Olá, tudo bem?");
  });

  it("preserva emoji no texto sem corromper (checagem de char code, não só visual)", () => {
    const link = montarLinkWhatsApp("5567981884764", "💎 pedido");
    const url = new URL(link);
    expect(url.searchParams.get("text")).toBe("💎 pedido");
  });
});

describe("montarMensagemPedido", () => {
  it("retorna mensagem genérica de abertura quando o carrinho está vazio", () => {
    const mensagem = montarMensagemPedido([]);
    expect(mensagem).toContain("Lírio Semijoias");
    expect(mensagem).not.toContain("Total:");
  });

  it("lista cada item com quantidade e subtotal, e soma o total geral", () => {
    const carrinho = [
      { id: "p1", nome: "Brinco Gota", preco: 49.9, quantidade: 2 },
      { id: "p2", nome: "Colar Lírio", preco: 89.9, quantidade: 1 },
    ];
    const mensagem = montarMensagemPedido(carrinho);

    expect(mensagem).toContain("2x Brinco Gota");
    expect(mensagem).toContain("1x Colar Lírio");
    expect(mensagem).toContain("Total: R$ 189,70");
  });
});
