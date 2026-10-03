// Comportamento do cabeçalho: fecha o menu mobile ao clicar num link e destaca
// no menu a seção que está visível na tela (scroll-spy).
const menuMobile = document.getElementById("menu-mobile");
const linksSecao = document.querySelectorAll('[data-secao]');
const secoes = document.querySelectorAll("section[id]");

// Clicar num link do menu mobile fecha o painel antes de rolar até a seção.
if (menuMobile) {
  menuMobile.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => menuMobile.hidePopover());
  });
}

function marcarSecaoAtual(idSecao) {
  linksSecao.forEach((link) => {
    link.classList.toggle("is-atual", link.dataset.secao === idSecao);
  });
}

if (secoes.length > 0 && "IntersectionObserver" in window) {
  const observador = new IntersectionObserver(
    (entradas) => {
      const visivel = entradas.find((entrada) => entrada.isIntersecting);
      if (visivel) marcarSecaoAtual(visivel.target.id);
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  secoes.forEach((secao) => observador.observe(secao));
}
