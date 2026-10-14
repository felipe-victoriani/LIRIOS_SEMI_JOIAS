// Galeria de fotos da peça: um <dialog> nativo com carrossel feito em CSS (scroll-snap).
// O diálogo é criado na primeira abertura e reaproveitado; as fotos só são baixadas nesse momento.
import { carregarFoto, carregarGaleria } from "./fotos.js";

let dialogo = null;
let faixa = null;
let miniaturas = null;
let contador = null;
let titulo = null;
let botaoAnterior = null;
let botaoProximo = null;
let botaoZoom = null;
let slidesAtuais = [];
let ultimoIndice = 0;

// Ícones em SVG (sem emoji), herdam a cor do texto.
const SETA_ESQUERDA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SETA_DIREITA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONE_ZOOM = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONE_FECHAR = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function criarBotaoIcone(classe, rotulo, svg) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.setAttribute("aria-label", rotulo);
  botao.innerHTML = svg;
  return botao;
}

// Índice do slide que está centralizado na faixa.
function indiceAtual() {
  return Math.round(faixa.scrollLeft / faixa.clientWidth);
}

function irPara(indice) {
  const alvo = Math.max(0, Math.min(slidesAtuais.length - 1, indice));
  faixa.scrollTo({ left: alvo * faixa.clientWidth, behavior: "smooth" });
}

// Atualiza contador, miniatura ativa e estado das setas conforme o slide visível.
function sincronizarIndicadores() {
  const indice = indiceAtual();
  // Ao passar para outra foto, a anterior volta ao tamanho normal.
  if (indice !== ultimoIndice) {
    faixa.querySelectorAll(".is-zoom").forEach((slide) => slide.classList.remove("is-zoom"));
    ultimoIndice = indice;
    atualizarBotaoZoom();
  }
  contador.textContent = `${indice + 1} / ${slidesAtuais.length}`;
  miniaturas.querySelectorAll("button").forEach((botao, posicao) => {
    botao.setAttribute("aria-current", String(posicao === indice));
  });
  botaoAnterior.disabled = indice === 0;
  botaoProximo.disabled = indice === slidesAtuais.length - 1;
}

// O botão de zoom reflete se a foto atual está ampliada.
function atualizarBotaoZoom() {
  const ampliada = Boolean(faixa.children[indiceAtual()]?.classList.contains("is-zoom"));
  botaoZoom.setAttribute("aria-pressed", String(ampliada));
  botaoZoom.setAttribute("aria-label", ampliada ? "Reduzir foto" : "Ampliar foto");
}

// Amplia/reduz o slide. A foto ampliada é maior que a caixa e se move com a rolagem nativa
// (arrastar com o dedo), sem biblioteca de gesto. `evento` dá o ponto a centralizar; sem ele, o centro.
function alternarZoom(slide, evento) {
  const imagem = slide.querySelector("img");
  const caixa = imagem.getBoundingClientRect();
  const x = evento && caixa.width ? (evento.clientX - caixa.left) / caixa.width : 0.5;
  const y = evento && caixa.height ? (evento.clientY - caixa.top) / caixa.height : 0.5;
  const ampliada = slide.classList.toggle("is-zoom");
  if (ampliada) {
    slide.scrollLeft = x * slide.scrollWidth - slide.clientWidth / 2;
    slide.scrollTop = y * slide.scrollHeight - slide.clientHeight / 2;
  }
  atualizarBotaoZoom();
}

function criarDialogo() {
  dialogo = document.createElement("dialog");
  dialogo.className = "galeria";
  dialogo.setAttribute("aria-labelledby", "galeria-titulo");

  const cabecalho = document.createElement("header");
  cabecalho.className = "galeria__cabecalho";
  titulo = document.createElement("h2");
  titulo.id = "galeria-titulo";
  titulo.className = "galeria__titulo";
  const botaoFechar = criarBotaoIcone("galeria__fechar", "Fechar fotos", ICONE_FECHAR);
  botaoFechar.addEventListener("click", () => dialogo.close());
  botaoZoom = criarBotaoIcone("galeria__fechar", "Ampliar foto", ICONE_ZOOM);
  botaoZoom.setAttribute("aria-pressed", "false");
  botaoZoom.addEventListener("click", () => {
    const slide = faixa.children[indiceAtual()];
    if (slide?.classList.contains("galeria__slide")) alternarZoom(slide);
  });
  const acoes = document.createElement("div");
  acoes.className = "galeria__acoes";
  acoes.append(botaoZoom, botaoFechar);
  cabecalho.append(titulo, acoes);

  const palco = document.createElement("div");
  palco.className = "galeria__palco";
  faixa = document.createElement("div");
  faixa.className = "galeria__faixa";
  faixa.tabIndex = 0;
  faixa.setAttribute("role", "group");
  faixa.setAttribute("aria-roledescription", "carrossel");
  faixa.addEventListener("scroll", sincronizarIndicadores, { passive: true });
  botaoAnterior = criarBotaoIcone("galeria__seta galeria__seta--anterior", "Foto anterior", SETA_ESQUERDA);
  botaoProximo = criarBotaoIcone("galeria__seta galeria__seta--proxima", "Próxima foto", SETA_DIREITA);
  botaoAnterior.addEventListener("click", () => irPara(indiceAtual() - 1));
  botaoProximo.addEventListener("click", () => irPara(indiceAtual() + 1));
  palco.append(faixa, botaoAnterior, botaoProximo);

  const rodape = document.createElement("footer");
  rodape.className = "galeria__rodape";
  miniaturas = document.createElement("div");
  miniaturas.className = "galeria__miniaturas";
  contador = document.createElement("p");
  contador.className = "galeria__contador";
  contador.setAttribute("aria-live", "polite");
  rodape.append(miniaturas, contador);

  dialogo.append(cabecalho, palco, rodape);

  // Setas do teclado trocam de foto (Esc já fecha, nativo do <dialog>).
  dialogo.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowLeft") irPara(indiceAtual() - 1);
    if (evento.key === "ArrowRight") irPara(indiceAtual() + 1);
  });
  // Clique fora da caixa (no fundo escurecido) fecha.
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });

  document.body.append(dialogo);
}

function montarSlides(nome, urls) {
  slidesAtuais = urls;
  faixa.innerHTML = "";
  miniaturas.innerHTML = "";
  faixa.setAttribute("aria-label", `Fotos de ${nome}`);

  urls.forEach((url, posicao) => {
    const slide = document.createElement("div");
    slide.className = "galeria__slide";
    const imagem = document.createElement("img");
    imagem.className = "galeria__foto";
    imagem.src = url;
    imagem.alt = `${nome} — foto ${posicao + 1} de ${urls.length}`;
    // Tocar/clicar na foto amplia no ponto tocado; tocar de novo reduz.
    imagem.addEventListener("click", (evento) => alternarZoom(slide, evento));
    slide.append(imagem);
    faixa.append(slide);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "galeria__miniatura";
    botao.setAttribute("aria-label", `Ver foto ${posicao + 1}`);
    const miniatura = document.createElement("img");
    miniatura.src = url;
    miniatura.alt = "";
    botao.append(miniatura);
    botao.addEventListener("click", () => irPara(posicao));
    miniaturas.append(botao);
  });

  // Uma foto só: sem setas, miniaturas nem contador.
  const varias = urls.length > 1;
  botaoAnterior.hidden = !varias;
  botaoProximo.hidden = !varias;
  miniaturas.hidden = !varias;
  contador.hidden = !varias;
  faixa.scrollLeft = 0;
  ultimoIndice = 0;
  atualizarBotaoZoom();
  sincronizarIndicadores();
}

/** Abre a galeria da peça: capa + fotos extras, baixadas só agora. */
export async function abrirGaleria(produto) {
  if (!dialogo) criarDialogo();
  titulo.textContent = produto.nome;
  faixa.innerHTML = "";
  miniaturas.innerHTML = "";
  contador.hidden = true;
  botaoAnterior.hidden = true;
  botaoProximo.hidden = true;
  faixa.setAttribute("aria-busy", "true");
  // Bloco pulsante no lugar da foto enquanto ela baixa.
  const esqueleto = document.createElement("div");
  esqueleto.className = "galeria__esqueleto";
  faixa.append(esqueleto);
  if (!dialogo.open) dialogo.showModal();

  const [capa, extras] = await Promise.all([
    produto.imagemUrl ? Promise.resolve(produto.imagemUrl) : carregarFoto(`produtos/${produto.id}`),
    carregarGaleria(produto.id),
  ]);
  faixa.removeAttribute("aria-busy");
  esqueleto.remove();

  // Se o diálogo foi fechado enquanto as fotos baixavam, não há o que montar.
  if (!dialogo.open) return;
  const urls = [capa, ...extras].filter(Boolean);
  if (urls.length === 0) {
    faixa.textContent = "Não foi possível carregar as fotos agora.";
    return;
  }
  montarSlides(produto.nome, urls);
}

/** Começa a baixar as fotos da peça antes do clique (chamado ao passar o mouse/focar na capa). */
export function preCarregarGaleria(produto) {
  if (!produto.imagemUrl) carregarFoto(`produtos/${produto.id}`);
  carregarGaleria(produto.id);
}
