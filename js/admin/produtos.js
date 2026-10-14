import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db } from "../firebase.js";
import { exigirAutenticacao } from "./guard.js";
import { formatarMoeda } from "../carrinho-core.js";
import { prepararImagem } from "../uploads.js";
import { carregarFoto, carregarGaleria, invalidarFoto } from "../fotos.js";

const corpoTabela = document.getElementById("corpo-tabela-produtos");
const estadoTabela = document.getElementById("estado-tabela-produtos");
const botaoSair = document.getElementById("botao-sair");
const botaoNovaPeca = document.getElementById("botao-nova-peca");
const botaoCancelarProduto = document.getElementById("botao-cancelar-produto");
const botaoSalvarProduto = document.getElementById("botao-salvar-produto");
const dialogoProduto = document.getElementById("dialogo-produto");
const formularioProduto = document.getElementById("formulario-produto");
const tituloDialogo = document.getElementById("titulo-dialogo-produto");
const campoId = document.getElementById("campo-produto-id");
const campoNome = document.getElementById("campo-nome");
const campoCategoria = document.getElementById("campo-categoria");
const campoPreco = document.getElementById("campo-preco");
const campoDescricao = document.getElementById("campo-descricao");
const listaSlots = document.getElementById("slots-fotos");
const campoAtivo = document.getElementById("campo-ativo");
const mensagemErroProduto = document.getElementById("mensagem-erro-produto");

let produtos = [];
let categorias = [];

// Cada peça tem até 3 fotos: slot 0 é a capa (/fotos/produtos/{id}), slots 1 e 2 são extras
// (/fotos/galeria/{id}/1 e /2). Cada slot guarda a foto atual do banco, um arquivo novo escolhido
// e se o admin pediu pra remover.
const TOTAL_SLOTS = 3;
let slots = [];
// Fotos extras como estão no banco (pra gravar só o que mudou) e promessa de quando terminam de carregar.
let galeriaOriginal = [];
let galeriaPronta = Promise.resolve();
let extrasEsperadas = 0;

// Traduz o erro técnico numa mensagem que ajude quem está usando o painel (ex: sessão expirada no celular).
function mensagemDeErro(erro) {
  const texto = `${erro?.code ?? ""} ${erro?.message ?? ""}`;
  if (/permission_denied/i.test(texto)) return "Sua sessão expirou. Saia do painel e entre de novo.";
  if (/não é uma imagem|grande demais|converter a imagem/i.test(texto)) return "Não consegui preparar essa foto. Tente outra imagem.";
  return "Não foi possível salvar agora. Tente novamente em instantes.";
}

function nomeDaCategoria(categoriaId) {
  return categorias.find((categoria) => categoria.id === categoriaId)?.nome ?? "—";
}

// O select é reconstruído a cada mudança nas categorias pra refletir criações/edições/exclusões.
function preencherSelectCategorias(categoriaSelecionada) {
  campoCategoria.innerHTML = "";
  if (categorias.length === 0) {
    const opcao = document.createElement("option");
    opcao.value = "";
    opcao.textContent = "Cadastre uma categoria primeiro";
    campoCategoria.append(opcao);
    return;
  }
  [...categorias]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .forEach((categoria) => {
      const opcao = document.createElement("option");
      opcao.value = categoria.id;
      opcao.textContent = categoria.nome;
      campoCategoria.append(opcao);
    });
  if (categoriaSelecionada) campoCategoria.value = categoriaSelecionada;
}

// Mostra a prévia e o botão "Remover" de acordo com o estado do slot.
function atualizarSlot(slot) {
  const urlVisivel = slot.arquivo ? slot.urlLocal : slot.removida ? null : slot.urlAtual;
  slot.previa.hidden = !urlVisivel;
  if (urlVisivel) slot.previa.src = urlVisivel;
  // A capa só pode ser trocada; as extras também podem ser removidas.
  slot.botaoRemover.hidden = slot.indice === 0 || !urlVisivel;
}

function criarSlot(indice) {
  const slot = { indice, arquivo: null, urlLocal: null, urlAtual: null, removida: false };

  const caixa = document.createElement("div");
  caixa.className = "foto-slot";

  const rotulo = document.createElement("label");
  rotulo.className = "foto-slot__rotulo";
  rotulo.htmlFor = `campo-foto-${indice}`;
  rotulo.textContent = indice === 0 ? "Capa" : `Foto ${indice + 1}`;

  slot.previa = document.createElement("img");
  slot.previa.className = "previa-imagem foto-slot__previa";
  slot.previa.alt = "";
  slot.previa.hidden = true;

  slot.input = document.createElement("input");
  slot.input.type = "file";
  slot.input.id = `campo-foto-${indice}`;
  slot.input.accept = "image/*";
  slot.input.addEventListener("change", () => {
    const arquivo = slot.input.files[0];
    if (!arquivo) return;
    if (slot.urlLocal) URL.revokeObjectURL(slot.urlLocal);
    slot.arquivo = arquivo;
    slot.urlLocal = URL.createObjectURL(arquivo);
    slot.removida = false;
    atualizarSlot(slot);
  });

  slot.botaoRemover = document.createElement("button");
  slot.botaoRemover.type = "button";
  slot.botaoRemover.className = "botao-link botao-link--perigo";
  slot.botaoRemover.textContent = "Remover foto";
  slot.botaoRemover.hidden = true;
  slot.botaoRemover.addEventListener("click", () => {
    if (slot.urlLocal) URL.revokeObjectURL(slot.urlLocal);
    slot.arquivo = null;
    slot.urlLocal = null;
    slot.removida = true;
    slot.input.value = "";
    atualizarSlot(slot);
  });

  caixa.append(rotulo, slot.previa, slot.input, slot.botaoRemover);
  listaSlots.append(caixa);
  return slot;
}

// Recria os 3 espaços zerados; é chamado sempre que o diálogo abre.
function reiniciarSlots() {
  slots.forEach((slot) => slot.urlLocal && URL.revokeObjectURL(slot.urlLocal));
  listaSlots.innerHTML = "";
  slots = Array.from({ length: TOTAL_SLOTS }, (_, indice) => criarSlot(indice));
  galeriaOriginal = [];
  galeriaPronta = Promise.resolve();
  extrasEsperadas = 0;
}

// Preenche os slots com as fotos que a peça já tem no banco.
function carregarFotosNosSlots(produto) {
  if (produto.imagemUrl) {
    slots[0].urlAtual = produto.imagemUrl;
    atualizarSlot(slots[0]);
  } else if (produto.temFoto) {
    carregarFoto(`produtos/${produto.id}`).then((url) => {
      if (url && campoId.value === produto.id) {
        slots[0].urlAtual = url;
        atualizarSlot(slots[0]);
      }
    });
  }

  extrasEsperadas = produto.fotosExtras ?? 0;
  if (extrasEsperadas > 0) {
    galeriaPronta = carregarGaleria(produto.id).then((lista) => {
      if (campoId.value !== produto.id) return;
      galeriaOriginal = lista;
      lista.forEach((url, posicao) => {
        slots[posicao + 1].urlAtual = url;
        atualizarSlot(slots[posicao + 1]);
      });
    });
  }
}

function abrirDialogoNovo() {
  formularioProduto.reset();
  campoId.value = "";
  campoAtivo.checked = true;
  reiniciarSlots();
  preencherSelectCategorias();
  tituloDialogo.textContent = "Nova peça";
  mensagemErroProduto.textContent = "";
  dialogoProduto.showModal();
}

function abrirDialogoEditar(produto) {
  formularioProduto.reset();
  campoId.value = produto.id;
  campoNome.value = produto.nome ?? "";
  campoPreco.value = produto.preco ?? "";
  campoDescricao.value = produto.descricao ?? "";
  campoAtivo.checked = produto.ativo !== false;
  reiniciarSlots();
  carregarFotosNosSlots(produto);
  preencherSelectCategorias(produto.categoriaId);
  tituloDialogo.textContent = "Editar peça";
  mensagemErroProduto.textContent = "";
  dialogoProduto.showModal();
}

function criarLinhaTabela(produto) {
  const linha = document.createElement("tr");

  const celulaNome = document.createElement("td");
  celulaNome.textContent = produto.nome;

  const celulaCategoria = document.createElement("td");
  celulaCategoria.textContent = nomeDaCategoria(produto.categoriaId);

  const celulaPreco = document.createElement("td");
  celulaPreco.textContent = formatarMoeda(Number(produto.preco) || 0);

  const celulaStatus = document.createElement("td");
  const selo = document.createElement("span");
  selo.className = produto.ativo === false ? "selo selo--inativo" : "selo selo--ativo";
  selo.textContent = produto.ativo === false ? "Inativo" : "Ativo";
  celulaStatus.append(selo);

  const celulaAcoes = document.createElement("td");
  celulaAcoes.className = "tabela-produtos__acoes";

  const botaoEditar = document.createElement("button");
  botaoEditar.type = "button";
  botaoEditar.className = "botao-link";
  botaoEditar.textContent = "Editar";
  botaoEditar.addEventListener("click", () => abrirDialogoEditar(produto));

  const botaoExcluir = document.createElement("button");
  botaoExcluir.type = "button";
  botaoExcluir.className = "botao-link botao-link--perigo";
  botaoExcluir.textContent = "Excluir";
  botaoExcluir.addEventListener("click", () => excluirProduto(produto));

  celulaAcoes.append(botaoEditar, botaoExcluir);
  linha.append(celulaNome, celulaCategoria, celulaPreco, celulaStatus, celulaAcoes);
  return linha;
}

function renderizarTabela() {
  corpoTabela.innerHTML = "";

  if (produtos.length === 0) {
    estadoTabela.textContent = "Nenhuma peça cadastrada ainda. Clique em “Nova peça” pra começar.";
    estadoTabela.hidden = false;
    return;
  }

  estadoTabela.hidden = true;
  produtos.forEach((produto) => corpoTabela.append(criarLinhaTabela(produto)));
}

async function excluirProduto(produto) {
  const confirmou = window.confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`);
  if (!confirmou) return;

  try {
    await update(ref(db), {
      [`produtos/${produto.id}`]: null,
      [`fotos/produtos/${produto.id}`]: null,
      [`fotos/galeria/${produto.id}`]: null,
    });
  } catch {
    window.alert("Não foi possível excluir agora. Tente novamente em instantes.");
  }
}

formularioProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemErroProduto.textContent = "";

  const preco = Number(campoPreco.value);
  const arquivoCapa = slots[0].arquivo;
  const novoProduto = !campoId.value;

  if (!campoNome.value.trim() || !Number.isFinite(preco) || preco <= 0) {
    mensagemErroProduto.textContent = "Preencha nome e um preço válido maior que zero.";
    return;
  }
  if (!campoCategoria.value) {
    mensagemErroProduto.textContent = "Escolha uma categoria. Se não houver nenhuma, cadastre em Categorias primeiro.";
    return;
  }

  botaoSalvarProduto.disabled = true;
  botaoSalvarProduto.textContent = "Salvando…";
  try {
    const id = campoId.value || push(ref(db, "produtos")).key;
    const campos = {
      nome: campoNome.value.trim(),
      categoriaId: campoCategoria.value,
      preco,
      descricao: campoDescricao.value.trim(),
      ativo: campoAtivo.checked,
    };
    if (novoProduto) campos.criadoEm = Date.now();

    // Espera as fotos extras terminarem de carregar; se falharam, não salva pra não apagá-las sem querer.
    await galeriaPronta;
    if (galeriaOriginal.length < extrasEsperadas) {
      mensagemErroProduto.textContent = "Não consegui carregar as fotos extras desta peça. Feche e abra de novo.";
      return;
    }

    // Tudo numa só escrita: dados da peça e fotos entram juntos ou não entram.
    const alteracoes = {};
    if (arquivoCapa) {
      alteracoes[`fotos/produtos/${id}`] = await prepararImagem(arquivoCapa);
      campos.temFoto = true;
      campos.imagemUrl = null; // remove foto antiga guardada no formato anterior
    }

    // Monta a lista final de extras, sem buracos: foto nova, ou a que já existia (se não foi removida).
    const extrasFinais = [];
    for (const slot of slots.slice(1)) {
      if (slot.arquivo) extrasFinais.push(await prepararImagem(slot.arquivo));
      else if (!slot.removida && slot.urlAtual) extrasFinais.push(slot.urlAtual);
    }
    // Grava só as posições que mudaram, pra não reenviar foto que já está no banco.
    for (let posicao = 1; posicao < TOTAL_SLOTS; posicao++) {
      const nova = extrasFinais[posicao - 1] ?? null;
      if (nova !== (galeriaOriginal[posicao - 1] ?? null)) alteracoes[`fotos/galeria/${id}/${posicao}`] = nova;
    }
    campos.fotosExtras = extrasFinais.length;

    Object.entries(campos).forEach(([campo, valor]) => {
      alteracoes[`produtos/${id}/${campo}`] = valor;
    });

    await update(ref(db), alteracoes);
    if (arquivoCapa) invalidarFoto(`produtos/${id}`);
    invalidarFoto(`galeria/${id}`);
    dialogoProduto.close();
  } catch (erro) {
    console.error("Erro ao salvar a peça:", erro);
    mensagemErroProduto.textContent = mensagemDeErro(erro);
  } finally {
    botaoSalvarProduto.disabled = false;
    botaoSalvarProduto.textContent = "Salvar";
  }
});

botaoNovaPeca.addEventListener("click", abrirDialogoNovo);
botaoCancelarProduto.addEventListener("click", () => dialogoProduto.close());

botaoSair.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

exigirAutenticacao(() => {
  onValue(
    ref(db, "produtos"),
    (snapshot) => {
      const dados = snapshot.val() || {};
      produtos = Object.entries(dados).map(([id, produto]) => ({ id, ...produto }));
      renderizarTabela();
    },
    () => {
      estadoTabela.textContent = "Não foi possível carregar os produtos agora.";
      estadoTabela.hidden = false;
    }
  );

  onValue(ref(db, "categorias"), (snapshot) => {
    const dados = snapshot.val() || {};
    categorias = Object.entries(dados).map(([id, categoria]) => ({ id, ...categoria }));
    renderizarTabela();
  });
});
