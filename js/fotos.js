// Fotos ficam em /fotos/{produtos|categorias}/{id}, separadas dos dados da peça. Assim a lista de
// produtos carrega leve, e cada foto só é baixada quando o card entra na tela.
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db } from "./firebase.js";

// Cache por caminho: a mesma foto não é baixada duas vezes (ex: ao filtrar categorias).
const cache = new Map();

/** Devolve a data URL da foto em `caminho` (ex: "produtos/abc") ou null. */
export function carregarFoto(caminho) {
  if (!cache.has(caminho)) {
    const pedido = get(ref(db, `fotos/${caminho}`))
      .then((snapshot) => snapshot.val())
      .catch(() => {
        cache.delete(caminho);
        return null;
      });
    cache.set(caminho, pedido);
  }
  return cache.get(caminho);
}

// Só busca a foto quando a imagem está perto de aparecer na tela (margem de 200px pra não piscar).
const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      const imagem = entrada.target;
      observador.unobserve(imagem);
      carregarFoto(imagem.dataset.foto).then((url) => {
        if (url) imagem.src = url;
      });
    });
  },
  { rootMargin: "200px" }
);

/**
 * Devolve as fotos extras da peça (até 2) em ordem, como lista de data URLs.
 * Ficam em /fotos/galeria/{produtoId}/{1|2}; só são baixadas quando alguém abre a galeria.
 */
export function carregarGaleria(produtoId) {
  const caminho = `galeria/${produtoId}`;
  if (!cache.has(caminho)) {
    const pedido = get(ref(db, `fotos/${caminho}`))
      .then((snapshot) => {
        const dados = snapshot.val() || {};
        // As posições são "1" e "2"; ordena pela chave e descarta lacunas.
        return Object.keys(dados)
          .sort()
          .map((posicao) => dados[posicao])
          .filter(Boolean);
      })
      .catch(() => {
        cache.delete(caminho);
        return [];
      });
    cache.set(caminho, pedido);
  }
  return cache.get(caminho);
}

/** Esquece a foto em cache depois de trocá-la, pra próxima leitura buscar a versão nova. */
export function invalidarFoto(caminho) {
  cache.delete(caminho);
}

/** Liga uma <img> à foto em `caminho`; a foto é baixada quando a imagem se aproximar da tela. */
export function carregarFotoQuandoVisivel(imagem, caminho) {
  imagem.dataset.foto = caminho;
  observador.observe(imagem);
}
