// Mantém o ano do rodapé sempre atual sem precisar editar o HTML todo ano.
const elementoAno = document.getElementById("ano-atual");
if (elementoAno) {
  elementoAno.textContent = String(new Date().getFullYear());
}
