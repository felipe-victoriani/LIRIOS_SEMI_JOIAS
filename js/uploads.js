// Preparação de imagens do admin. A foto é redimensionada no navegador (as originais chegam com
// 2048 px e ~2,5 MB; o site só precisa de algo bem menor) e guardada como texto (data URL) direto
// no Realtime Database, junto do cadastro. Assim não é preciso Firebase Storage.

const LADO_MAXIMO = 800;
const QUALIDADE = 0.8;

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

function blobParaDataUrl(blob) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result);
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

/** Redimensiona para caber em LADO_MAXIMO e devolve uma data URL (WebP, ou JPEG se o navegador não suportar WebP). */
export async function prepararImagem(arquivo) {
  const imagem = await carregarImagem(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);

  let blob = await new Promise((resolver) => canvas.toBlob(resolver, "image/webp", QUALIDADE));
  if (!blob) blob = await new Promise((resolver) => canvas.toBlob(resolver, "image/jpeg", QUALIDADE));
  return blobParaDataUrl(blob);
}
