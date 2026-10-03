import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, onValue, push, update, remove, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db } from "../firebase.js";
import { exigirAutenticacao } from "./guard.js";
import { enviarImagem } from "../uploads.js";

const corpoTabela = document.getElementById("corpo-tabela-categorias");
const estadoTabela = document.getElementById("estado-tabela-categorias");
const botaoSair = document.getElementById("botao-sair");
const botaoNova = document.getElementById("botao-nova-categoria");
const botaoCancelar = document.getElementById("botao-cancelar-categoria");
const botaoSalvar = document.getElementById("botao-salvar-categoria");
const dialogo = document.getElementById("dialogo-categoria");
const formulario = document.getElementById("formulario-categoria");
const titulo = document.getElementById("titulo-dialogo-categoria");
const campoId = document.getElementById("campo-categoria-id");
const campoNome = document.getElementById("campo-categoria-nome");
const campoOrdem = document.getElementById("campo-categoria-ordem");
const campoImagem = document.getElementById("campo-categoria-imagem");
const previaImagem = document.getElementById("previa-categoria-imagem");
const mensagemErro = document.getElementById("mensagem-erro-categoria");

let categorias = [];
let produtos = [];
let imagemAtual = null;

function contarPecas(categoriaId) {
  return produtos.filter((produto) => produto.categoriaId === categoriaId).length;
}

function abrirNova() {
  formulario.reset();
  campoId.value = "";
  campoOrdem.value = String(categorias.length);
  imagemAtual = null;
  previaImagem.hidden = true;
  titulo.textContent = "Nova categoria";
  mensagemErro.textContent = "";
  dialogo.showModal();
}

function abrirEditar(categoria) {
  formulario.reset();
  campoId.value = categoria.id;
  campoNome.value = categoria.nome ?? "";
  campoOrdem.value = String(categoria.ordem ?? 0);
  imagemAtual = categoria.imagemUrl ?? null;
  previaImagem.src = imagemAtual ?? "";
  previaImagem.hidden = !imagemAtual;
  titulo.textContent = "Editar categoria";
  mensagemErro.textContent = "";
  dialogo.showModal();
}

campoImagem.addEventListener("change", () => {
  const arquivo = campoImagem.files[0];
  if (!arquivo) return;
  previaImagem.src = URL.createObjectURL(arquivo);
  previaImagem.hidden = false;
});

function criarLinha(categoria) {
  const linha = document.createElement("tr");

  const celulaFoto = document.createElement("td");
  const foto = document.createElement("img");
  foto.className = "previa-imagem previa-imagem--redonda";
  foto.alt = "";
  foto.width = 48;
  foto.height = 48;
  if (categoria.imagemUrl) foto.src = categoria.imagemUrl;
  celulaFoto.append(foto);

  const celulaNome = document.createElement("td");
  celulaNome.textContent = categoria.nome;

  const celulaOrdem = document.createElement("td");
  celulaOrdem.textContent = String(categoria.ordem ?? 0);

  const celulaPecas = document.createElement("td");
  celulaPecas.textContent = String(contarPecas(categoria.id));

  const celulaAcoes = document.createElement("td");
  celulaAcoes.className = "tabela-produtos__acoes";

  const botaoEditar = document.createElement("button");
  botaoEditar.type = "button";
  botaoEditar.className = "botao-link";
  botaoEditar.textContent = "Editar";
  botaoEditar.addEventListener("click", () => abrirEditar(categoria));

  const botaoExcluir = document.createElement("button");
  botaoExcluir.type = "button";
  botaoExcluir.className = "botao-link botao-link--perigo";
  botaoExcluir.textContent = "Excluir";
  botaoExcluir.addEventListener("click", () => excluirCategoria(categoria));

  celulaAcoes.append(botaoEditar, botaoExcluir);
  linha.append(celulaFoto, celulaNome, celulaOrdem, celulaPecas, celulaAcoes);
  return linha;
}

function renderizarTabela() {
  corpoTabela.innerHTML = "";
  if (categorias.length === 0) {
    estadoTabela.textContent = "Nenhuma categoria cadastrada ainda. Clique em “Nova categoria” pra começar.";
    estadoTabela.hidden = false;
    return;
  }
  estadoTabela.hidden = true;
  [...categorias]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .forEach((categoria) => corpoTabela.append(criarLinha(categoria)));
}

// Bloqueia a exclusão enquanto houver peças na categoria. Consulta o banco de novo (e não só a lista
// em memória) pra não apagar uma categoria que acabou de receber uma peça em outra aba.
async function excluirCategoria(categoria) {
  const consulta = query(ref(db, "produtos"), orderByChild("categoriaId"), equalTo(categoria.id));
  const snapshot = await get(consulta);
  const quantidade = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;

  if (quantidade > 0) {
    window.alert(
      `Não é possível excluir "${categoria.nome}": ela tem ${quantidade} peça(s). Mova ou exclua essas peças antes.`
    );
    return;
  }

  if (!window.confirm(`Excluir a categoria "${categoria.nome}"? Essa ação não pode ser desfeita.`)) return;

  try {
    await remove(ref(db, `categorias/${categoria.id}`));
  } catch {
    window.alert("Não foi possível excluir agora. Tente novamente em instantes.");
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemErro.textContent = "";

  const nome = campoNome.value.trim();
  const ordem = Number(campoOrdem.value);
  const arquivo = campoImagem.files[0];
  const novaCategoria = !campoId.value;

  if (!nome) {
    mensagemErro.textContent = "Dê um nome pra categoria.";
    return;
  }
  if (!Number.isInteger(ordem) || ordem < 0) {
    mensagemErro.textContent = "A ordem precisa ser um número inteiro, a partir de zero.";
    return;
  }
  if (novaCategoria && !arquivo) {
    mensagemErro.textContent = "Escolha uma foto pro círculo da categoria.";
    return;
  }

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando…";
  try {
    const imagemUrl = arquivo ? await enviarImagem(arquivo, "categorias") : imagemAtual;
    const dados = { nome, ordem, imagemUrl };

    if (campoId.value) {
      await update(ref(db, `categorias/${campoId.value}`), dados);
    } else {
      await push(ref(db, "categorias"), { ...dados, criadoEm: Date.now() });
    }
    dialogo.close();
  } catch {
    mensagemErro.textContent = "Não foi possível salvar agora. Tente novamente em instantes.";
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar";
  }
});

botaoNova.addEventListener("click", abrirNova);
botaoCancelar.addEventListener("click", () => dialogo.close());

botaoSair.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

exigirAutenticacao(() => {
  onValue(
    ref(db, "categorias"),
    (snapshot) => {
      const dados = snapshot.val() || {};
      categorias = Object.entries(dados).map(([id, categoria]) => ({ id, ...categoria }));
      renderizarTabela();
    },
    () => {
      estadoTabela.textContent = "Não foi possível carregar as categorias agora.";
      estadoTabela.hidden = false;
    }
  );

  onValue(ref(db, "produtos"), (snapshot) => {
    const dados = snapshot.val() || {};
    produtos = Object.entries(dados).map(([id, produto]) => ({ id, ...produto }));
    renderizarTabela();
  });
});
