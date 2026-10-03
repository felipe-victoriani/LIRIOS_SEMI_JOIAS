import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../firebase.js";

const formulario = document.getElementById("formulario-login");
const campoEmail = document.getElementById("campo-email");
const campoSenha = document.getElementById("campo-senha");
const mensagemErro = document.getElementById("mensagem-erro");
const botaoEntrar = document.getElementById("botao-entrar");

// Já logado? Pula direto pro painel em vez de pedir login de novo.
onAuthStateChanged(auth, (usuario) => {
  if (usuario) window.location.href = "dashboard.html";
});

const ERROS_CREDENCIAL = new Set([
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/invalid-credential",
  "auth/invalid-email",
]);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemErro.textContent = "";
  botaoEntrar.disabled = true;
  botaoEntrar.textContent = "Entrando…";

  try {
    await signInWithEmailAndPassword(auth, campoEmail.value.trim(), campoSenha.value);
    window.location.href = "dashboard.html";
  } catch (erro) {
    mensagemErro.textContent = ERROS_CREDENCIAL.has(erro.code)
      ? "E-mail ou senha inválidos."
      : "Não foi possível entrar agora. Tente novamente em instantes.";
    botaoEntrar.disabled = false;
    botaoEntrar.textContent = "Entrar";
  }
});
