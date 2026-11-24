// =====================================================
// 1) COLE AQUI as duas informações do seu Supabase
//    (Project Settings -> API)
// =====================================================
const SUPABASE_URL = "https://qhlbcotufhwgnkeghedi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nv-Ov_Xp3pMIWALgCFQTyg_VZxwYasB";

// =====================================================
// 2) Conexão com o Supabase
// =====================================================
const { createClient } = supabase; // "supabase" vem do script do CDN
const cliente = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================
// 3) Pegando os elementos da página
// =====================================================
const telaLogin = document.getElementById("tela-login");
const telaSite = document.getElementById("tela-site");
const formLogin = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const botaoEntrar = document.getElementById("botao-entrar");
const mensagemErro = document.getElementById("mensagem-erro");
const botaoSair = document.getElementById("botao-sair");
const tituloSite = document.getElementById("titulo-site");
const mensagemBoasVindas = document.getElementById("mensagem-boas-vindas");
const emailLogado = document.getElementById("email-logado");

// =====================================================
// 4) Funções para trocar de tela
// =====================================================
function mostrarLogin() {
  telaSite.classList.add("oculto");
  telaLogin.classList.remove("oculto");
}

function mostrarSite() {
  telaLogin.classList.add("oculto");
  telaSite.classList.remove("oculto");
}

// =====================================================
// 5) Carregar os textos do banco de dados (teste!)
// =====================================================
async function carregarTextos() {
  const { data, error } = await cliente
    .from("site_settings")
    .select("chave, valor");

  if (error) {
    mensagemBoasVindas.textContent = "Erro ao ler o banco: " + error.message;
    return;
  }

  // Transforma a lista em um "dicionário": { titulo_site: "...", ... }
  const textos = {};
  data.forEach((linha) => {
    textos[linha.chave] = linha.valor;
  });

  tituloSite.textContent = textos.titulo_site || "Nosso Cantinho";
  mensagemBoasVindas.textContent = textos.mensagem_boas_vindas || "";
}

// =====================================================
// 6) Login
// =====================================================
formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // impede a página de recarregar
  mensagemErro.textContent = "";
  botaoEntrar.disabled = true;
  botaoEntrar.textContent = "Entrando...";

  const { error } = await cliente.auth.signInWithPassword({
    email: campoEmail.value.trim(),
    password: campoSenha.value,
  });

  botaoEntrar.disabled = false;
  botaoEntrar.textContent = "Entrar";

  if (error) {
    mensagemErro.textContent = traduzirErro(error.message);
    return;
  }

  campoSenha.value = ""; // limpa a senha da tela
  // A troca de tela acontece sozinha no "vigia" (passo 8)
});

function traduzirErro(mensagem) {
  if (mensagem.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (mensagem.includes("Email not confirmed")) {
    return "Esse e-mail ainda não foi confirmado.";
  }
  if (mensagem.includes("Failed to fetch")) {
    return "Não consegui conectar. Confira a Project URL no script.js.";
  }
  return "Erro: " + mensagem;
}

// =====================================================
// 7) Sair
// =====================================================
botaoSair.addEventListener("click", async () => {
  await cliente.auth.signOut();
});

// =====================================================
// 8) "Vigia": reage sempre que alguém entra ou sai
//    (também roda ao abrir a página, para lembrar do login)
// =====================================================
cliente.auth.onAuthStateChange((evento, sessao) => {
  if (sessao) {
    emailLogado.textContent = "Conectado como " + sessao.user.email;
    mostrarSite();
    carregarTextos();
  } else {
    mostrarLogin();
  }
});
