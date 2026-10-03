// Busca os produtos no Realtime Database e renderiza a grade do catálogo.
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db } from "./firebase.js";
import { formatarMoeda } from "./carrinho-core.js";
import { adicionarAoCarrinho } from "./carrinho-ui.js";

const gradeEl = document.getElementById("grade-produtos");
const filtrosEl = document.getElementById("filtros-categoria");
const avisoExemploEl = document.getElementById("aviso-exemplo-catalogo");

// Peças de exemplo — aparecem só enquanto não há nenhum produto real cadastrado no Firebase
// (catálogo vazio ou Firebase ainda não configurado em js/firebase-config.js). Servem pra já dar
// pra ver o layout do card no site de verdade; somem sozinhas assim que o admin cadastrar peças
// reais, porque aí o snapshot do Firebase deixa de vir vazio.
const PRODUTOS_EXEMPLO = [
  { id: "exemplo-1", nome: "Brinco Gota Dourado", categoria: "Brincos", preco: 49.9 },
  { id: "exemplo-2", nome: "Colar Lírio Delicado", categoria: "Colares", preco: 129.9 },
  { id: "exemplo-3", nome: "Anel Solitário Banhado a Ouro", categoria: "Anéis", preco: 89.0 },
  { id: "exemplo-4", nome: "Pulseira Elos Finos", categoria: "Pulseiras", preco: 159.9 },
];

let produtosTodos = [];
let categoriaAtiva = "Todas";
// Quantidade escolhida em cada card antes de adicionar à sacola (chave: id do produto).
const quantidadesSelecionadas = new Map();

function mostrarEstado(mensagem) {
  gradeEl.innerHTML = "";
  const estado = document.createElement("p");
  estado.className = "catalogo__estado";
  estado.textContent = mensagem;
  gradeEl.append(estado);
}

function criarPlaceholderImagem(categoria) {
  const figura = document.createElement("div");
  figura.className = "produto-card__imagem produto-card__imagem--placeholder";
  figura.innerHTML =
    '<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><path d="M24 6l9 9-9 27-9-27 9-9Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 15h18M12 15l12 27M36 15 24 42" stroke="currentColor" stroke-width="1.2"/></svg>';
  const legenda = document.createElement("span");
  legenda.textContent = "Foto em breve";
  figura.append(legenda);
  return figura;
}

function criarCardProduto(produto) {
  const card = document.createElement("article");
  card.className = "produto-card";

  if (produto.imagemUrl) {
    const imagem = document.createElement("img");
    imagem.className = "produto-card__imagem";
    imagem.src = produto.imagemUrl;
    imagem.alt = produto.nome;
    imagem.loading = "lazy";
    imagem.width = 320;
    imagem.height = 320;
    card.append(imagem);
  } else {
    card.append(criarPlaceholderImagem(produto.categoria));
  }

  const corpo = document.createElement("div");
  corpo.className = "produto-card__corpo";

  const categoria = document.createElement("p");
  categoria.className = "produto-card__categoria";
  categoria.textContent = produto.categoria;

  const nome = document.createElement("h3");
  nome.className = "produto-card__nome";
  nome.textContent = produto.nome;

  const preco = document.createElement("p");
  preco.className = "produto-card__preco";
  preco.textContent = formatarMoeda(produto.preco);

  corpo.append(categoria, nome, preco);

  const rodape = document.createElement("div");
  rodape.className = "produto-card__rodape";

  if (!quantidadesSelecionadas.has(produto.id)) quantidadesSelecionadas.set(produto.id, 1);

  const stepper = document.createElement("div");
  stepper.className = "stepper";

  const botaoMenos = document.createElement("button");
  botaoMenos.type = "button";
  botaoMenos.className = "stepper__botao";
  botaoMenos.textContent = "−";
  botaoMenos.setAttribute("aria-label", `Diminuir quantidade de ${produto.nome}`);

  const valorQuantidade = document.createElement("span");
  valorQuantidade.className = "stepper__valor";
  valorQuantidade.textContent = String(quantidadesSelecionadas.get(produto.id));
  valorQuantidade.setAttribute("aria-live", "polite");

  const botaoMais = document.createElement("button");
  botaoMais.type = "button";
  botaoMais.className = "stepper__botao";
  botaoMais.textContent = "+";
  botaoMais.setAttribute("aria-label", `Aumentar quantidade de ${produto.nome}`);

  botaoMenos.addEventListener("click", () => {
    const atual = Math.max(1, quantidadesSelecionadas.get(produto.id) - 1);
    quantidadesSelecionadas.set(produto.id, atual);
    valorQuantidade.textContent = String(atual);
  });

  botaoMais.addEventListener("click", () => {
    const atual = quantidadesSelecionadas.get(produto.id) + 1;
    quantidadesSelecionadas.set(produto.id, atual);
    valorQuantidade.textContent = String(atual);
  });

  stepper.append(botaoMenos, valorQuantidade, botaoMais);

  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.className = "botao botao--primario botao--pequeno";
  botaoAdicionar.textContent = "Adicionar";
  botaoAdicionar.setAttribute("aria-label", `Adicionar ${produto.nome} à sacola`);
  botaoAdicionar.addEventListener("click", () => {
    adicionarAoCarrinho(produto, quantidadesSelecionadas.get(produto.id));
    quantidadesSelecionadas.set(produto.id, 1);
    valorQuantidade.textContent = "1";
  });

  rodape.append(stepper, botaoAdicionar);
  card.append(corpo, rodape);
  return card;
}

function renderizarGrade() {
  const produtosFiltrados =
    categoriaAtiva === "Todas"
      ? produtosTodos
      : produtosTodos.filter((produto) => produto.categoria === categoriaAtiva);

  if (produtosFiltrados.length === 0) {
    mostrarEstado(
      categoriaAtiva === "Todas"
        ? "Nenhuma peça cadastrada ainda. Volte em breve!"
        : `Nenhuma peça em "${categoriaAtiva}" por enquanto.`
    );
    return;
  }

  gradeEl.innerHTML = "";
  produtosFiltrados.forEach((produto) => gradeEl.append(criarCardProduto(produto)));
}

filtrosEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-categoria]");
  if (!botao) return;

  categoriaAtiva = botao.dataset.categoria;

  filtrosEl.querySelectorAll("[data-categoria]").forEach((el) => {
    const ativo = el === botao;
    el.classList.toggle("is-ativa", ativo);
    el.setAttribute("aria-pressed", String(ativo));
  });

  renderizarGrade();
});

let respondeuFirebase = false;

function usarExemplos() {
  if (respondeuFirebase) return;
  respondeuFirebase = true;
  produtosTodos = PRODUTOS_EXEMPLO;
  avisoExemploEl.hidden = false;
  renderizarGrade();
}

const produtosRef = ref(db, "produtos");
onValue(
  produtosRef,
  (snapshot) => {
    respondeuFirebase = true;
    const dados = snapshot.val() || {};
    const produtosReais = Object.entries(dados)
      .map(([id, produto]) => ({ id, ...produto }))
      .filter((produto) => produto.ativo !== false);

    if (produtosReais.length === 0) {
      produtosTodos = PRODUTOS_EXEMPLO;
      avisoExemploEl.hidden = false;
    } else {
      produtosTodos = produtosReais;
      avisoExemploEl.hidden = true;
    }
    renderizarGrade();
  },
  // Sem conexão com o Firebase (ex: config placeholder ainda não preenchida) — mostra os
  // exemplos em vez de uma tela de erro, já que nesse caso provável é só config pendente.
  usarExemplos
);

// O SDK do Realtime Database às vezes não chama nem o callback de sucesso nem o de erro quando
// a config é só um placeholder (a conexão WebSocket fica tentando em segundo plano sem nunca
// reportar falha) — por isso esse prazo de segurança: se nada respondeu, assume-se que o
// catálogo ainda não tem Firebase configurado e mostra os exemplos.
setTimeout(usarExemplos, 2500);
