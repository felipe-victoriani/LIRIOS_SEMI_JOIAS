// Lógica pura do carrinho: sem DOM, sem localStorage — só dados entrando e saindo.
// Isso que permite testar com Vitest sem precisar de navegador.
//
// Formato de um item: { id, nome, preco (number, em reais), categoria, quantidade }

/** Adiciona `quantidade` unidades de um produto. Se já existe no carrinho, soma a quantidade. */
export function adicionarItem(carrinho, produto, quantidade = 1) {
  if (quantidade <= 0) return carrinho;

  const existente = carrinho.find((item) => item.id === produto.id);

  if (existente) {
    return carrinho.map((item) =>
      item.id === produto.id
        ? { ...item, quantidade: item.quantidade + quantidade }
        : item
    );
  }

  return [
    ...carrinho,
    {
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      categoria: produto.categoria,
      quantidade,
    },
  ];
}

/** Remove um item do carrinho pelo id, independente da quantidade. */
export function removerItem(carrinho, produtoId) {
  return carrinho.filter((item) => item.id !== produtoId);
}

/** Define a quantidade exata de um item. Quantidade <= 0 remove o item. */
export function atualizarQuantidade(carrinho, produtoId, quantidade) {
  if (quantidade <= 0) return removerItem(carrinho, produtoId);

  return carrinho.map((item) =>
    item.id === produtoId ? { ...item, quantidade } : item
  );
}

/** Soma de preço × quantidade de todos os itens. */
export function calcularTotal(carrinho) {
  return carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
}

/** Soma só das quantidades — usado no contador do ícone da sacola. */
export function calcularQuantidadeTotal(carrinho) {
  return carrinho.reduce((total, item) => total + item.quantidade, 0);
}

/** Formata um valor numérico em reais (BRL), ex: 89.9 -> "R$ 89,90". */
export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
