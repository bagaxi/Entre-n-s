// =====================================================
// NAVEGAÇÃO ENTRE SEÇÕES
// (o login e o banco de dados continuam no script.js)
// =====================================================
const secoes = document.querySelectorAll(".secao");
const botoesMenu = document.querySelectorAll(".menu [data-ir]");

// Mostra uma seção e esconde as outras.
// Exemplo de uso: irParaSecao("galeria")
function irParaSecao(nome) {
  secoes.forEach((secao) => {
    secao.classList.toggle("ativa", secao.dataset.secao === nome);
  });

  botoesMenu.forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.ir === nome);
  });

  window.scrollTo(0, 0); // volta para o topo da página
}

// Qualquer elemento com data-ir="..." (botões do menu e cards)
// chama a função acima quando é clicado.
document.addEventListener("click", (evento) => {
  const alvo = evento.target.closest("[data-ir]");
  if (alvo) {
    irParaSecao(alvo.dataset.ir);
  }
});

// Ao sair, a próxima pessoa que entrar começa pelo Início
document.getElementById("botao-sair").addEventListener("click", () => {
  irParaSecao("inicio");
});

// =====================================================
// CONTADOR EM TEMPO REAL
// =====================================================

// Data de início: ano, mês, dia, hora, minuto, segundo
// ATENÇÃO: o mês começa em 0 (janeiro = 0), então novembro = 10
const DATA_INICIO = new Date(2026, 10, 1, 0, 0, 0);

const contadorDias = document.getElementById("contador-dias");
const contadorHoras = document.getElementById("contador-horas");
const contadorMinutos = document.getElementById("contador-minutos");
const contadorSegundos = document.getElementById("contador-segundos");

function doisDigitos(numero) {
  return String(numero).padStart(2, "0");
}

function atualizarContador() {
  let diferenca = Date.now() - DATA_INICIO.getTime();
  if (diferenca < 0) diferenca = 0; // se a data ainda não chegou, mostra zeros

  const totalSegundos = Math.floor(diferenca / 1000);

  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  contadorDias.textContent = dias;
  contadorHoras.textContent = doisDigitos(horas);
  contadorMinutos.textContent = doisDigitos(minutos);
  contadorSegundos.textContent = doisDigitos(segundos);
}

atualizarContador();                 // mostra já na primeira vez
setInterval(atualizarContador, 1000); // e atualiza a cada 1 segundo
