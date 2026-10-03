// Helpers puros pra montar o link de pedido via WhatsApp.
// Sempre api.whatsapp.com/send — nunca wa.me (o redirecionamento do wa.me corrompe emoji na mensagem).
import { formatarMoeda } from "./carrinho-core.js";

const BASE_WHATSAPP = "https://api.whatsapp.com/send";

/** Monta a URL final do WhatsApp a partir de um telefone (só dígitos, com DDI) e uma mensagem. */
export function montarLinkWhatsApp(telefone, mensagem) {
  const parametros = new URLSearchParams({ phone: telefone });
  if (mensagem) parametros.set("text", mensagem);
  return `${BASE_WHATSAPP}?${parametros.toString()}`;
}

/** Monta o texto do pedido a partir do carrinho, pronto pra virar mensagem de WhatsApp. */
export function montarMensagemPedido(carrinho) {
  if (carrinho.length === 0) {
    return "Oi! Vim pelo site da Lírio Semijoias e queria montar um pedido.";
  }

  const linhasItens = carrinho
    .map((item) => `💎 ${item.quantidade}x ${item.nome} — ${formatarMoeda(item.preco * item.quantidade)}`)
    .join("\n");

  const total = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);

  return [
    "Oi! Vim pelo site da Lírio Semijoias e gostaria de fechar este pedido:",
    "",
    linhasItens,
    "",
    `Total: ${formatarMoeda(total)}`,
  ].join("\n");
}
