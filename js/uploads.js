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

// Limite da regra do banco (700 mil caracteres) com folga, pra a gravação não ser recusada.
const TAMANHO_MAXIMO_DATA_URL = 650000;

function codificar(canvas, tipo, qualidade) {
  return new Promise((resolver) => canvas.toBlob(resolver, tipo, qualidade));
}

/**
 * Redimensiona para caber em LADO_MAXIMO e devolve uma data URL.
 * Atenção: o Safari (iPhone) não gera WebP — o toBlob devolve PNG sem avisar, que fica
 * bem maior que o limite do banco. Por isso confere o tipo real e reduz até caber.
 */
export async function prepararImagem(arquivo) {
  const imagem = await carregarImagem(arquivo);
  let lado = LADO_MAXIMO;
  let qualidade = QUALIDADE;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const escala = Math.min(1, lado / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);

    let blob = await codificar(canvas, "image/webp", qualidade);
    if (!blob || blob.type !== "image/webp") blob = await codificar(canvas, "image/jpeg", qualidade);
    if (!blob) throw new Error("Não foi possível converter a imagem.");

    const dataUrl = await blobParaDataUrl(blob);
    if (dataUrl.length <= TAMANHO_MAXIMO_DATA_URL) return dataUrl;

    // Ainda grande: diminui a qualidade e o tamanho e tenta de novo.
    qualidade = Math.max(0.5, qualidade - 0.1);
    lado = Math.round(lado * 0.85);
  }
  throw new Error("Imagem grande demais, mesmo reduzida. Tente outra foto.");
}
