import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db } from "../firebase.js";
import { exigirAutenticacao } from "./guard.js";
import { formatarMoeda } from "../carrinho-core.js";
import { prepararImagem } from "../uploads.js";
import { carregarFoto, invalidarFoto } from "../fotos.js";

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
const campoImagem = document.getElementById("campo-imagem");
const previaImagem = document.getElementById("previa-imagem");
const campoAtivo = document.getElementById("campo-ativo");
const mensagemErroProduto = document.getElementById("mensagem-erro-produto");

let produtos = [];
let categorias = [];

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

campoImagem.addEventListener("change", () => {
  const arquivo = campoImagem.files[0];
  if (!arquivo) return;
  previaImagem.src = URL.createObjectURL(arquivo);
  previaImagem.hidden = false;
});

function abrirDialogoNovo() {
  formularioProduto.reset();
  campoId.value = "";
  campoAtivo.checked = true;
  previaImagem.hidden = true;
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
  previaImagem.hidden = true;
  if (produto.imagemUrl) {
    previaImagem.src = produto.imagemUrl;
    previaImagem.hidden = false;
  } else if (produto.temFoto) {
    carregarFoto(`produtos/${produto.id}`).then((url) => {
      if (url && campoId.value === produto.id) {
        previaImagem.src = url;
        previaImagem.hidden = false;
      }
    });
  }
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
    await update(ref(db), { [`produtos/${produto.id}`]: null, [`fotos/produtos/${produto.id}`]: null });
  } catch {
    window.alert("Não foi possível excluir agora. Tente novamente em instantes.");
  }
}

formularioProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemErroProduto.textContent = "";

  const preco = Number(campoPreco.value);
  const arquivo = campoImagem.files[0];
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

    // Tudo numa só escrita: dados da peça e foto entram juntos ou não entram.
    const alteracoes = {};
    if (arquivo) {
      alteracoes[`fotos/produtos/${id}`] = await prepararImagem(arquivo);
      campos.temFoto = true;
      campos.imagemUrl = null; // remove foto antiga guardada no formato anterior
    }
    Object.entries(campos).forEach(([campo, valor]) => {
      alteracoes[`produtos/${id}/${campo}`] = valor;
    });

    await update(ref(db), alteracoes);
    if (arquivo) invalidarFoto(`produtos/${id}`);
    dialogoProduto.close();
  } catch {
    mensagemErroProduto.textContent = "Não foi possível salvar agora. Tente novamente em instantes.";
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
