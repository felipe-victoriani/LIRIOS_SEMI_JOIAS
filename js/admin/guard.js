// Protege páginas do admin: redireciona pro login se não houver usuário autenticado.
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../firebase.js";

/** Chama `aoAutenticar(usuario)` só quando há sessão válida; senão redireciona ao login. */
export function exigirAutenticacao(aoAutenticar) {
  onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
      window.location.href = "login.html";
      return;
    }
    aoAutenticar(usuario);
  });
}
