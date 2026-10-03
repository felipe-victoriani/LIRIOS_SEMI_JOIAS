import { describe, it, expect } from "vitest";
import {
  adicionarItem,
  removerItem,
  atualizarQuantidade,
  calcularTotal,
  calcularQuantidadeTotal,
  formatarMoeda,
} from "../js/carrinho-core.js";

const brinco = { id: "p1", nome: "Brinco Gota", preco: 49.9, categoria: "Brincos" };
const colar = { id: "p2", nome: "Colar Lírio", preco: 89.9, categoria: "Colares" };

describe("adicionarItem", () => {
  it("adiciona um produto novo com a quantidade informada", () => {
    const carrinho = adicionarItem([], brinco, 2);
    expect(carrinho).toEqual([{ ...brinco, quantidade: 2 }]);
  });

  it("soma a quantidade quando o produto já está no carrinho", () => {
    const carrinho = adicionarItem([{ ...brinco, quantidade: 1 }], brinco, 3);
    expect(carrinho).toHaveLength(1);
    expect(carrinho[0].quantidade).toBe(4);
  });

  it("ignora quantidade zero ou negativa sem alterar o carrinho", () => {
    const carrinho = adicionarItem([], brinco, 0);
    expect(carrinho).toEqual([]);
  });

  it("não modifica o array original (imutabilidade)", () => {
    const original = [{ ...brinco, quantidade: 1 }];
    adicionarItem(original, brinco, 1);
    expect(original[0].quantidade).toBe(1);
  });
});

describe("removerItem", () => {
  it("remove só o item pelo id, mantendo os demais", () => {
    const carrinho = [{ ...brinco, quantidade: 1 }, { ...colar, quantidade: 2 }];
    expect(removerItem(carrinho, "p1")).toEqual([{ ...colar, quantidade: 2 }]);
  });

  it("não quebra se o id não existir no carrinho", () => {
    const carrinho = [{ ...brinco, quantidade: 1 }];
    expect(removerItem(carrinho, "inexistente")).toEqual(carrinho);
  });
});

describe("atualizarQuantidade", () => {
  it("atualiza a quantidade exata de um item existente", () => {
    const carrinho = [{ ...brinco, quantidade: 1 }];
    expect(atualizarQuantidade(carrinho, "p1", 5)[0].quantidade).toBe(5);
  });

  it("remove o item quando a quantidade cai pra zero ou menos", () => {
    const carrinho = [{ ...brinco, quantidade: 1 }];
    expect(atualizarQuantidade(carrinho, "p1", 0)).toEqual([]);
    expect(atualizarQuantidade(carrinho, "p1", -3)).toEqual([]);
  });
});

describe("calcularTotal / calcularQuantidadeTotal", () => {
  it("soma preço × quantidade de todos os itens", () => {
    const carrinho = [
      { ...brinco, quantidade: 2 },
      { ...colar, quantidade: 1 },
    ];
    expect(calcularTotal(carrinho)).toBeCloseTo(49.9 * 2 + 89.9);
  });

  it("retorna 0 pra carrinho vazio", () => {
    expect(calcularTotal([])).toBe(0);
    expect(calcularQuantidadeTotal([])).toBe(0);
  });

  it("soma só as quantidades, ignorando o preço", () => {
    const carrinho = [{ ...brinco, quantidade: 2 }, { ...colar, quantidade: 3 }];
    expect(calcularQuantidadeTotal(carrinho)).toBe(5);
  });
});

describe("formatarMoeda", () => {
  it("formata número em reais no padrão brasileiro", () => {
    expect(formatarMoeda(49.9)).toBe("R$ 49,90");
  });

  it("formata zero corretamente", () => {
    expect(formatarMoeda(0)).toBe("R$ 0,00");
  });
});
