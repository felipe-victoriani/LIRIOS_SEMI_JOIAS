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
let slidesAtuais = [];

// Ícones em SVG (sem emoji), herdam a cor do texto.
const SETA_ESQUERDA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SETA_DIREITA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
  contador.textContent = `${indice + 1} / ${slidesAtuais.length}`;
  miniaturas.querySelectorAll("button").forEach((botao, posicao) => {
    botao.setAttribute("aria-current", String(posicao === indice));
  });
  botaoAnterior.disabled = indice === 0;
  botaoProximo.disabled = indice === slidesAtuais.length - 1;
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
  cabecalho.append(titulo, botaoFechar);

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
    const imagem = document.createElement("img");
    imagem.className = "galeria__foto";
    imagem.src = url;
    imagem.alt = `${nome} — foto ${posicao + 1} de ${urls.length}`;
    faixa.append(imagem);

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
  if (!dialogo.open) dialogo.showModal();

  const [capa, extras] = await Promise.all([
    produto.imagemUrl ? Promise.resolve(produto.imagemUrl) : carregarFoto(`produtos/${produto.id}`),
    carregarGaleria(produto.id),
  ]);
  faixa.removeAttribute("aria-busy");

  // Se o diálogo foi fechado enquanto as fotos baixavam, não há o que montar.
  if (!dialogo.open) return;
  const urls = [capa, ...extras].filter(Boolean);
  if (urls.length === 0) {
    faixa.textContent = "Não foi possível carregar as fotos agora.";
    return;
  }
  montarSlides(produto.nome, urls);
}
