// Camada de DOM do carrinho: persistência em localStorage + renderização do painel.
// A lógica de dados em si (somar, remover, calcular total) vive em carrinho-core.js.
import {
  adicionarItem,
  removerItem,
  atualizarQuantidade,
  calcularTotal,
  calcularQuantidadeTotal,
  formatarMoeda,
} from "./carrinho-core.js";
import { montarLinkWhatsApp, montarMensagemPedido } from "./whatsapp.js";

const CHAVE_STORAGE = "lirio:carrinho";
const NUMERO_WHATSAPP = "5567981884764";

const listaEl = document.getElementById("lista-carrinho");
const subtotalEl = document.getElementById("subtotal-carrinho");
const contadorEl = document.getElementById("contador-carrinho");
const botaoFinalizarEl = document.getElementById("botao-finalizar");
const botaoLimparEl = document.getElementById("botao-limpar-carrinho");

function lerCarrinho() {
  try {
    const bruto = localStorage.getItem(CHAVE_STORAGE);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    // localStorage pode falhar (modo privado, storage bloqueado) — carrinho em memória só nesta sessão.
    return [];
  }
}

function salvarCarrinho(carrinho) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(carrinho));
  } catch {
    // Sem persistência nesse caso, mas a UI continua funcionando normalmente.
  }
}

let carrinhoAtual = lerCarrinho();

function criarLinhaItem(item) {
  const linha = document.createElement("li");
  linha.className = "carrinho-item";
  linha.dataset.itemId = item.id;

  const info = document.createElement("div");
  info.className = "carrinho-item__info";

  const nome = document.createElement("p");
  nome.className = "carrinho-item__nome";
  nome.textContent = item.nome;

  const preco = document.createElement("p");
  preco.className = "carrinho-item__preco";
  preco.textContent = formatarMoeda(item.preco);

  info.append(nome, preco);

  const controles = document.createElement("div");
  controles.className = "carrinho-item__controles";

  const botaoMenos = document.createElement("button");
  botaoMenos.type = "button";
  botaoMenos.className = "stepper__botao";
  botaoMenos.textContent = "−";
  botaoMenos.setAttribute("aria-label", `Diminuir quantidade de ${item.nome}`);
  botaoMenos.addEventListener("click", () => {
    carrinhoAtual = atualizarQuantidade(carrinhoAtual, item.id, item.quantidade - 1);
    persistirERenderizar();
  });

  const quantidade = document.createElement("span");
  quantidade.className = "stepper__valor";
  quantidade.textContent = String(item.quantidade);
  quantidade.setAttribute("aria-live", "polite");

  const botaoMais = document.createElement("button");
  botaoMais.type = "button";
  botaoMais.className = "stepper__botao";
  botaoMais.textContent = "+";
  botaoMais.setAttribute("aria-label", `Aumentar quantidade de ${item.nome}`);
  botaoMais.addEventListener("click", () => {
    carrinhoAtual = atualizarQuantidade(carrinhoAtual, item.id, item.quantidade + 1);
    persistirERenderizar();
  });

  const botaoRemover = document.createElement("button");
  botaoRemover.type = "button";
  botaoRemover.className = "carrinho-item__remover";
  botaoRemover.setAttribute("aria-label", `Remover ${item.nome} da sacola`);
  botaoRemover.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  botaoRemover.addEventListener("click", () => {
    carrinhoAtual = removerItem(carrinhoAtual, item.id);
    persistirERenderizar();
  });

  controles.append(botaoMenos, quantidade, botaoMais, botaoRemover);
  linha.append(info, controles);
  return linha;
}

function renderizarCarrinho() {
  listaEl.innerHTML = "";

  if (carrinhoAtual.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "painel-carrinho__vazio";
    vazio.textContent = "Sua sacola está vazia.";
    listaEl.append(vazio);
  } else {
    const lista = document.createElement("ul");
    lista.setAttribute("role", "list");
    lista.className = "carrinho-item__lista";
    carrinhoAtual.forEach((item) => lista.append(criarLinhaItem(item)));
    listaEl.append(lista);
  }

  const total = calcularTotal(carrinhoAtual);
  subtotalEl.textContent = formatarMoeda(total);

  const quantidadeTotal = calcularQuantidadeTotal(carrinhoAtual);
  contadorEl.textContent = String(quantidadeTotal);
  contadorEl.style.visibility = quantidadeTotal > 0 ? "visible" : "hidden";

  const temItens = carrinhoAtual.length > 0;
  botaoFinalizarEl.href = montarLinkWhatsApp(NUMERO_WHATSAPP, montarMensagemPedido(carrinhoAtual));
  botaoFinalizarEl.setAttribute("aria-disabled", String(!temItens));
  botaoFinalizarEl.classList.toggle("botao--desabilitado", !temItens);
}

function persistirERenderizar() {
  salvarCarrinho(carrinhoAtual);
  renderizarCarrinho();
}

/** Usado pelo catálogo pra adicionar um produto à sacola. */
export function adicionarAoCarrinho(produto, quantidade) {
  carrinhoAtual = adicionarItem(carrinhoAtual, produto, quantidade);
  persistirERenderizar();
}

botaoFinalizarEl.addEventListener("click", (evento) => {
  if (botaoFinalizarEl.getAttribute("aria-disabled") === "true") {
    evento.preventDefault();
  }
});

botaoLimparEl.addEventListener("click", () => {
  carrinhoAtual = [];
  persistirERenderizar();
});

renderizarCarrinho();
