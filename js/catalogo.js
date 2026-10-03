// Busca categorias e produtos no Realtime Database e renderiza os círculos e a grade do catálogo.
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db } from "./firebase.js";
import { formatarMoeda } from "./carrinho-core.js";
import { adicionarAoCarrinho } from "./carrinho-ui.js";
import { carregarFotoQuandoVisivel } from "./fotos.js";

const gradeEl = document.getElementById("grade-produtos");
const secaoCatalogoEl = document.getElementById("catalogo");
const categoriasEl = secaoCatalogoEl.querySelector(".categorias");

const TODAS = "todas";

// Dados de exemplo — aparecem só enquanto não há categorias nem peças cadastradas no Firebase
// (ou enquanto o Firebase ainda não está configurado). Somem sozinhos assim que o admin cadastrar.
const CATEGORIAS_EXEMPLO = [
  { id: "exemplo-brincos", nome: "Brincos", imagemUrl: "assets/categorias/brincos.webp", ordem: 1 },
  { id: "exemplo-colares", nome: "Colares", imagemUrl: "assets/categorias/colares.webp", ordem: 2 },
  { id: "exemplo-aneis", nome: "Anéis", imagemUrl: "assets/categorias/aneis.webp", ordem: 3 },
  { id: "exemplo-pulseiras", nome: "Pulseiras", imagemUrl: "assets/categorias/pulseiras.webp", ordem: 4 },
];

const PRODUTOS_EXEMPLO = [
  { id: "exemplo-1", nome: "Brinco Gota Dourado", categoriaId: "exemplo-brincos", preco: 49.9 },
  { id: "exemplo-2", nome: "Colar Lírio Delicado", categoriaId: "exemplo-colares", preco: 129.9 },
  { id: "exemplo-3", nome: "Anel Solitário Banhado a Ouro", categoriaId: "exemplo-aneis", preco: 89.0 },
  { id: "exemplo-4", nome: "Pulseira Elos Finos", categoriaId: "exemplo-pulseiras", preco: 159.9 },
];

let categorias = [];
let produtos = [];
let categoriaAtiva = TODAS;
let respondeuFirebase = false;
let produtosCarregados = false;
let temDadosReais = { categorias: false, produtos: false };
// Quantidade escolhida em cada card antes de adicionar à sacola (chave: id do produto).
const quantidadesSelecionadas = new Map();

function mostrarEstado(mensagem) {
  gradeEl.innerHTML = "";
  const estado = document.createElement("p");
  estado.className = "catalogo__estado";
  estado.textContent = mensagem;
  gradeEl.append(estado);
}

mostrarEstado("Carregando peças…");

function nomeDaCategoria(categoriaId) {
  return categorias.find((categoria) => categoria.id === categoriaId)?.nome ?? "";
}

function criarPlaceholderImagem() {
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

  if (produto.imagemUrl || produto.temFoto) {
    const imagem = document.createElement("img");
    imagem.className = "produto-card__imagem";
    imagem.alt = produto.nome;
    imagem.width = 320;
    imagem.height = 320;
    if (produto.imagemUrl) imagem.src = produto.imagemUrl;
    else carregarFotoQuandoVisivel(imagem, `produtos/${produto.id}`);
    card.append(imagem);
  } else {
    card.append(criarPlaceholderImagem());
  }

  const corpo = document.createElement("div");
  corpo.className = "produto-card__corpo";

  const categoria = document.createElement("p");
  categoria.className = "produto-card__categoria";
  categoria.textContent = nomeDaCategoria(produto.categoriaId);

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
    adicionarAoCarrinho(
      { id: produto.id, nome: produto.nome, preco: produto.preco, categoria: nomeDaCategoria(produto.categoriaId) },
      quantidadesSelecionadas.get(produto.id)
    );
    quantidadesSelecionadas.set(produto.id, 1);
    valorQuantidade.textContent = "1";
  });

  rodape.append(stepper, botaoAdicionar);
  card.append(corpo, rodape);
  return card;
}

function criarCirculoCategoria(id, nome, imagemUrl, temFoto) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "categoria";
  botao.dataset.categoria = id;
  botao.setAttribute("aria-pressed", String(id === categoriaAtiva));
  if (id === categoriaAtiva) botao.classList.add("is-ativa");

  const circulo = document.createElement("span");
  circulo.className = "categoria__circulo";
  const imagem = document.createElement("img");
  imagem.alt = "";
  imagem.width = 68;
  imagem.height = 68;
  if (imagemUrl) imagem.src = imagemUrl;
  else if (temFoto) carregarFotoQuandoVisivel(imagem, `categorias/${id}`);
  circulo.append(imagem);

  const rotulo = document.createElement("span");
  rotulo.className = "categoria__nome";
  rotulo.textContent = nome;

  botao.append(circulo, rotulo);
  return botao;
}

function renderizarCategorias() {
  categoriasEl.innerHTML = "";
  categoriasEl.append(criarCirculoCategoria(TODAS, "Todas", "assets/categorias/todas.webp", false));
  [...categorias]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .forEach((categoria) =>
      categoriasEl.append(criarCirculoCategoria(categoria.id, categoria.nome, categoria.imagemUrl, categoria.temFoto))
    );
}

function renderizarGrade() {
  // Se a categoria ativa deixou de existir (ex: foi excluída), volta pra "Todas".
  if (categoriaAtiva !== TODAS && !categorias.some((categoria) => categoria.id === categoriaAtiva)) {
    categoriaAtiva = TODAS;
    renderizarCategorias();
  }

  const produtosFiltrados =
    categoriaAtiva === TODAS ? produtos : produtos.filter((produto) => produto.categoriaId === categoriaAtiva);

  if (produtosFiltrados.length === 0) {
    mostrarEstado(
      categoriaAtiva === TODAS
        ? "Nenhuma peça cadastrada ainda. Volte em breve!"
        : `Nenhuma peça em "${nomeDaCategoria(categoriaAtiva)}" por enquanto.`
    );
    return;
  }

  gradeEl.innerHTML = "";
  produtosFiltrados.forEach((produto) => gradeEl.append(criarCardProduto(produto)));
}

secaoCatalogoEl.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-categoria]");
  if (!botao) return;

  categoriaAtiva = botao.dataset.categoria;
  secaoCatalogoEl.querySelectorAll("[data-categoria]").forEach((el) => {
    const ativo = el.dataset.categoria === categoriaAtiva;
    el.classList.toggle("is-ativa", ativo);
    el.setAttribute("aria-pressed", String(ativo));
  });
  renderizarGrade();
});

function aplicarExemplos() {
  categorias = CATEGORIAS_EXEMPLO;
  produtos = PRODUTOS_EXEMPLO;
  renderizarCategorias();
  renderizarGrade();
}

// Só usa os exemplos quando não há nem categoria nem peça real. Se o admin já cadastrou
// categorias mas ainda não tem peças, a grade mostra a mensagem de "nenhuma peça" normalmente.
function atualizarFonte() {
  if (!temDadosReais.categorias && !temDadosReais.produtos) {
    aplicarExemplos();
    return;
  }
  renderizarCategorias();
  // Enquanto as peças não chegaram, a grade continua com "Carregando" em vez de "Nenhuma peça".
  if (produtosCarregados) renderizarGrade();
}

function usarExemplosSeSemResposta() {
  if (respondeuFirebase) return;
  respondeuFirebase = true;
  aplicarExemplos();
}

onValue(
  ref(db, "categorias"),
  (snapshot) => {
    respondeuFirebase = true;
    const dados = snapshot.val() || {};
    categorias = Object.entries(dados).map(([id, categoria]) => ({ id, ...categoria }));
    temDadosReais.categorias = categorias.length > 0;
    atualizarFonte();
  },
  usarExemplosSeSemResposta
);

onValue(
  ref(db, "produtos"),
  (snapshot) => {
    respondeuFirebase = true;
    const dados = snapshot.val() || {};
    produtos = Object.entries(dados)
      .map(([id, produto]) => ({ id, ...produto }))
      .filter((produto) => produto.ativo !== false);
    temDadosReais.produtos = produtos.length > 0;
    produtosCarregados = true;
    atualizarFonte();
  },
  usarExemplosSeSemResposta
);

// O SDK do Realtime Database às vezes não chama nem o callback de sucesso nem o de erro quando
// a config é só um placeholder — por isso o prazo de segurança: se nada respondeu, mostra os exemplos.
setTimeout(usarExemplosSeSemResposta, 2500);
