import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db } from "../firebase.js";
import { exigirAutenticacao } from "./guard.js";
import { formatarMoeda } from "../carrinho-core.js";

const corpoTabela = document.getElementById("corpo-tabela-produtos");
const estadoTabela = document.getElementById("estado-tabela-produtos");
const botaoSair = document.getElementById("botao-sair");
const botaoNovaPeca = document.getElementById("botao-nova-peca");
const botaoCancelarProduto = document.getElementById("botao-cancelar-produto");
const dialogoProduto = document.getElementById("dialogo-produto");
const formularioProduto = document.getElementById("formulario-produto");
const tituloDialogo = document.getElementById("titulo-dialogo-produto");
const campoId = document.getElementById("campo-produto-id");
const campoNome = document.getElementById("campo-nome");
const campoCategoria = document.getElementById("campo-categoria");
const campoPreco = document.getElementById("campo-preco");
const campoDescricao = document.getElementById("campo-descricao");
const campoImagemUrl = document.getElementById("campo-imagem-url");
const campoAtivo = document.getElementById("campo-ativo");
const mensagemErroProduto = document.getElementById("mensagem-erro-produto");

let produtos = [];

function abrirDialogoNovo() {
  formularioProduto.reset();
  campoId.value = "";
  campoAtivo.checked = true;
  tituloDialogo.textContent = "Nova peça";
  mensagemErroProduto.textContent = "";
  dialogoProduto.showModal();
}

function abrirDialogoEditar(produto) {
  campoId.value = produto.id;
  campoNome.value = produto.nome ?? "";
  campoCategoria.value = produto.categoria ?? "Brincos";
  campoPreco.value = produto.preco ?? "";
  campoDescricao.value = produto.descricao ?? "";
  campoImagemUrl.value = produto.imagemUrl ?? "";
  campoAtivo.checked = produto.ativo !== false;
  tituloDialogo.textContent = "Editar peça";
  mensagemErroProduto.textContent = "";
  dialogoProduto.showModal();
}

function criarLinhaTabela(produto) {
  const linha = document.createElement("tr");

  const celulaNome = document.createElement("td");
  celulaNome.textContent = produto.nome;

  const celulaCategoria = document.createElement("td");
  celulaCategoria.textContent = produto.categoria;

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
  if (!campoNome.value.trim() || !Number.isFinite(preco) || preco <= 0) {
    mensagemErroProduto.textContent = "Preencha nome e um preço válido maior que zero.";
    return;
  }

  const dadosProduto = {
    nome: campoNome.value.trim(),
    categoria: campoCategoria.value,
    preco,
    descricao: campoDescricao.value.trim(),
    imagemUrl: campoImagemUrl.value.trim() || null,
    ativo: campoAtivo.checked,
  };

  try {
    if (campoId.value) {
      await update(ref(db, `produtos/${campoId.value}`), dadosProduto);
    } else {
      await push(ref(db, "produtos"), { ...dadosProduto, criadoEm: Date.now() });
    }
    dialogoProduto.close();
  } catch {
    mensagemErroProduto.textContent = "Não foi possível salvar agora. Tente novamente em instantes.";
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
});
