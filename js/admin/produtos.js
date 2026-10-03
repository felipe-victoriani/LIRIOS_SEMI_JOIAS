import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db } from "../firebase.js";
import { exigirAutenticacao } from "./guard.js";
import { formatarMoeda } from "../carrinho-core.js";
import { enviarImagem } from "../uploads.js";

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
let imagemAtual = null;

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
  imagemAtual = null;
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
  imagemAtual = produto.imagemUrl ?? null;
  previaImagem.src = imagemAtual ?? "";
  previaImagem.hidden = !imagemAtual;
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
    await remove(ref(db, `produtos/${produto.id}`));
  } catch {
    window.alert("Não foi possível excluir agora. Tente novamente em instantes.");
  }
}

formularioProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemErroProduto.textContent = "";

  const preco = Number(campoPreco.value);
  const arquivo = campoImagem.files[0];

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
    const imagemUrl = arquivo ? await enviarImagem(arquivo, "produtos") : imagemAtual;
    const dadosProduto = {
      nome: campoNome.value.trim(),
      categoriaId: campoCategoria.value,
      preco,
      descricao: campoDescricao.value.trim(),
      imagemUrl: imagemUrl || null,
      ativo: campoAtivo.checked,
    };

    if (campoId.value) {
      await update(ref(db, `produtos/${campoId.value}`), dadosProduto);
    } else {
      await push(ref(db, "produtos"), { ...dadosProduto, criadoEm: Date.now() });
    }
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
