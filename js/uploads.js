// Upload de imagens pro Firebase Storage. Antes de subir, a foto é redimensionada no navegador:
// as fotos originais chegam com 2048 px e pesam ~2,5 MB, e o site só precisa de algo bem menor.
import { ref as refStorage, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebase.js";

const LADO_MAXIMO = 1024;
const QUALIDADE = 0.86;

function carregarImagem(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      rejeitar(new Error("Arquivo não é uma imagem válida."));
    };
    imagem.src = url;
  });
}

/** Redimensiona para caber em LADO_MAXIMO e devolve um Blob em WebP (ou JPEG, se o navegador não suportar WebP). */
export async function reduzirImagem(arquivo) {
  const imagem = await carregarImagem(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);

  const blobWebp = await new Promise((resolver) => canvas.toBlob(resolver, "image/webp", QUALIDADE));
  if (blobWebp) return { blob: blobWebp, extensao: "webp" };
  const blobJpeg = await new Promise((resolver) => canvas.toBlob(resolver, "image/jpeg", QUALIDADE));
  return { blob: blobJpeg, extensao: "jpg" };
}

/** Sobe a imagem em `pasta` (ex: "produtos" ou "categorias") e devolve a URL pública. */
export async function enviarImagem(arquivo, pasta) {
  const { blob, extensao } = await reduzirImagem(arquivo);
  const nomeUnico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;
  const caminho = refStorage(storage, `${pasta}/${nomeUnico}`);
  await uploadBytes(caminho, blob, { contentType: blob.type });
  return getDownloadURL(caminho);
}
