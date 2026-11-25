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

  // Ao abrir a linha do tempo, busca os momentos no banco
  if (nome === "linha-do-tempo") {
    carregarLinhaDoTempo();
  }

  // Ao abrir a cápsula do tempo, busca as cartas no banco
  if (nome === "capsula") {
    carregarCartas();
  }

  // Ao abrir a galeria, começa pela tela principal (sem álbum aberto)
  if (nome === "galeria") {
    albumAberto = null;
    carregarGaleria();
  }
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

atualizarContador();                  // mostra já na primeira vez
setInterval(atualizarContador, 1000); // e atualiza a cada 1 segundo

// =====================================================
// LINHA DO TEMPO
// (usa o "cliente" do Supabase, criado no script.js)
// =====================================================
const listaTimeline = document.getElementById("timeline-lista");
const statusTimeline = document.getElementById("timeline-status");

// Janela de adicionar/editar
const modalMomento = document.getElementById("modal-momento");
const formMomento = document.getElementById("form-momento");
const tituloModalMomento = document.getElementById("modal-titulo-momento");
const campoMomentoTitulo = document.getElementById("momento-titulo");
const campoMomentoData = document.getElementById("momento-data");
const campoMomentoDescricao = document.getElementById("momento-descricao");
const botaoSalvarMomento = document.getElementById("botao-salvar-momento");
const erroMomento = document.getElementById("momento-erro");

// Janela de confirmar exclusão
const modalConfirmar = document.getElementById("modal-confirmar");
const textoConfirmar = document.getElementById("confirmar-texto");
const botaoConfirmarExclusao = document.getElementById("botao-confirmar-exclusao");
const erroConfirmar = document.getElementById("confirmar-erro");

// Guardam qual momento está sendo editado / excluído agora
// (null = nenhum; no caso da edição, null significa "momento novo")
let momentoEmEdicao = null;
let momentoParaExcluir = null;

// Transforma "2026-11-01" em "1 de novembro de 2026"
function formatarData(textoData) {
  const [ano, mes, dia] = textoData.split("-").map(Number);
  // O mês começa em 0, por isso "mes - 1".
  // Criar a data assim (e não com new Date("2026-11-01")) evita
  // que ela "volte um dia" por causa do fuso horário.
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Cria um botãozinho de texto ("Editar" / "Excluir")
function criarBotaoAcao(texto, classeExtra, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "acao-texto " + classeExtra;
  botao.textContent = texto;
  botao.addEventListener("click", aoClicar);
  return botao;
}

// Monta o desenho de UM momento na tela
function criarItemMomento(momento) {
  const item = document.createElement("li");
  item.className = "timeline-item";

  const data = document.createElement("time");
  data.className = "timeline-data";
  data.dateTime = momento.data_momento;
  data.textContent = formatarData(momento.data_momento);

  const titulo = document.createElement("h3");
  titulo.className = "timeline-titulo";
  titulo.textContent = momento.titulo;

  item.append(data, titulo);

  if (momento.descricao) {
    const descricao = document.createElement("p");
    descricao.className = "timeline-descricao";
    descricao.textContent = momento.descricao;
    item.appendChild(descricao);
  }

  // Botões Editar e Excluir
  const acoes = document.createElement("div");
  acoes.className = "timeline-acoes";
  acoes.append(
    criarBotaoAcao("Editar", "editar", () => abrirModalEdicao(momento)),
    criarBotaoAcao("Excluir", "perigo", () => abrirModalExclusao(momento))
  );
  item.appendChild(acoes);

  return item;
}

// Busca os momentos no banco e desenha todos na tela
async function carregarLinhaDoTempo() {
  statusTimeline.textContent = "Carregando...";

  const { data, error } = await cliente
    .from("linha_do_tempo")
    .select("id, titulo, data_momento, descricao")
    .order("data_momento", { ascending: true }); // do mais antigo ao mais novo

  if (error) {
    statusTimeline.textContent = "Não consegui carregar os momentos: " + error.message;
    return;
  }

  listaTimeline.innerHTML = ""; // limpa a lista antes de desenhar de novo

  if (data.length === 0) {
    statusTimeline.textContent = "Ainda não há momentos. Que tal adicionar o primeiro?";
    return;
  }

  statusTimeline.textContent = "";
  data.forEach((momento) => {
    listaTimeline.appendChild(criarItemMomento(momento));
  });
}

// ---------- Janela de ADICIONAR ----------
document.getElementById("botao-novo-momento").addEventListener("click", () => {
  momentoEmEdicao = null; // null = estamos criando um momento novo
  formMomento.reset();
  erroMomento.textContent = "";
  tituloModalMomento.textContent = "Novo momento";
  modalMomento.showModal();
});

// ---------- Janela de EDITAR (a mesma, já preenchida) ----------
function abrirModalEdicao(momento) {
  momentoEmEdicao = momento;
  erroMomento.textContent = "";
  tituloModalMomento.textContent = "Editar momento";
  campoMomentoTitulo.value = momento.titulo;
  campoMomentoData.value = momento.data_momento; // já vem como "2026-11-01"
  campoMomentoDescricao.value = momento.descricao || "";
  modalMomento.showModal();
}

document.getElementById("botao-cancelar-momento").addEventListener("click", () => {
  modalMomento.close();
});

// ---------- SALVAR (serve para adicionar e para editar) ----------
formMomento.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroMomento.textContent = "";
  botaoSalvarMomento.disabled = true;
  botaoSalvarMomento.textContent = "Salvando...";

  const dados = {
    titulo: campoMomentoTitulo.value.trim(),
    data_momento: campoMomentoData.value,
    descricao: campoMomentoDescricao.value.trim() || null,
  };

  let resposta;
  if (momentoEmEdicao) {
    // Editando: atualiza só a linha com este id
    resposta = await cliente
      .from("linha_do_tempo")
      .update(dados)
      .eq("id", momentoEmEdicao.id)
      .select();
  } else {
    // Novo: insere uma linha nova
    resposta = await cliente.from("linha_do_tempo").insert(dados).select();
  }

  botaoSalvarMomento.disabled = false;
  botaoSalvarMomento.textContent = "Salvar";

  if (resposta.error) {
    erroMomento.textContent = "Não consegui salvar: " + resposta.error.message;
    return;
  }

  // Se nenhuma linha voltou, o banco recusou (falta de permissão)
  if (resposta.data.length === 0) {
    erroMomento.textContent = "Não foi possível salvar. Confira as permissões no Supabase.";
    return;
  }

  modalMomento.close();
  carregarLinhaDoTempo(); // atualiza a lista
});

// ---------- EXCLUIR (com confirmação) ----------
function abrirModalExclusao(momento) {
  momentoParaExcluir = momento;
  erroConfirmar.textContent = "";
  textoConfirmar.textContent =
    "“" + momento.titulo + "” será apagado para sempre. Essa ação não pode ser desfeita.";
  modalConfirmar.showModal();
}

document.getElementById("botao-cancelar-exclusao").addEventListener("click", () => {
  modalConfirmar.close();
});

botaoConfirmarExclusao.addEventListener("click", async () => {
  erroConfirmar.textContent = "";
  botaoConfirmarExclusao.disabled = true;
  botaoConfirmarExclusao.textContent = "Excluindo...";

  const { data, error } = await cliente
    .from("linha_do_tempo")
    .delete()
    .eq("id", momentoParaExcluir.id)
    .select();

  botaoConfirmarExclusao.disabled = false;
  botaoConfirmarExclusao.textContent = "Excluir";

  if (error) {
    erroConfirmar.textContent = "Não consegui excluir: " + error.message;
    return;
  }

  if (data.length === 0) {
    erroConfirmar.textContent = "Não foi possível excluir. Confira as permissões no Supabase.";
    return;
  }

  modalConfirmar.close();
  carregarLinhaDoTempo(); // atualiza a lista
});

// =====================================================
// GALERIA DE FOTOS E ÁLBUNS
// As imagens ficam no Storage (balde "fotos", privado);
// as tabelas "galeria" e "albuns" guardam as listas.
// =====================================================
const tituloGaleria = document.getElementById("galeria-titulo");
const subtituloGaleria = document.getElementById("galeria-subtitulo");
const statusGaleria = document.getElementById("galeria-status");
const barraAlbum = document.getElementById("barra-album");
const botaoNovoAlbum = document.getElementById("botao-novo-album");
const blocoAlbuns = document.getElementById("bloco-albuns");
const gradeAlbuns = document.getElementById("albuns-grade");
const blocoFotos = document.getElementById("bloco-fotos");
const tituloFotos = document.getElementById("titulo-fotos");
const gradeGaleria = document.getElementById("galeria-grade");

// Janela de adicionar/editar FOTO
const modalGaleria = document.getElementById("modal-galeria");
const formGaleria = document.getElementById("form-galeria");
const tituloModalGaleria = document.getElementById("modal-titulo-galeria");
const grupoArquivo = document.getElementById("grupo-arquivo");
const campoGaleriaArquivo = document.getElementById("galeria-arquivo");
const campoGaleriaLegenda = document.getElementById("galeria-legenda");
const campoGaleriaData = document.getElementById("galeria-data");
const grupoAlbum = document.getElementById("grupo-album");
const campoGaleriaAlbum = document.getElementById("galeria-album");
const dicaGaleria = document.getElementById("galeria-dica");
const botaoSalvarGaleria = document.getElementById("botao-salvar-galeria");
const erroGaleria = document.getElementById("galeria-erro");

// Janela da foto grande
const modalVisualizador = document.getElementById("modal-visualizador");
const imagemVisualizador = document.getElementById("visualizador-imagem");
const legendaVisualizador = document.getElementById("visualizador-legenda");
const dataVisualizador = document.getElementById("visualizador-data");

// Janela de confirmar exclusão da FOTO
const modalConfirmarFoto = document.getElementById("modal-confirmar-foto");
const botaoConfirmarExclusaoFoto = document.getElementById("botao-confirmar-exclusao-foto");
const erroConfirmarFoto = document.getElementById("confirmar-foto-erro");

// Janela de criar/editar ÁLBUM
const modalAlbum = document.getElementById("modal-album");
const formAlbum = document.getElementById("form-album");
const tituloModalAlbum = document.getElementById("modal-titulo-album");
const campoAlbumNome = document.getElementById("album-nome");
const campoAlbumDescricao = document.getElementById("album-descricao");
const botaoSalvarAlbum = document.getElementById("botao-salvar-album");
const erroAlbum = document.getElementById("album-erro");

// Janela de confirmar exclusão do ÁLBUM
const modalConfirmarAlbum = document.getElementById("modal-confirmar-album");
const textoConfirmarAlbum = document.getElementById("confirmar-album-texto");
const botaoConfirmarExclusaoAlbum = document.getElementById("botao-confirmar-exclusao-album");
const erroConfirmarAlbum = document.getElementById("confirmar-album-erro");

// "Memória" da galeria
let listaAlbuns = [];     // todos os álbuns
let listaFotos = [];      // todas as fotos
let albumAberto = null;   // álbum aberto agora (null = tela principal da galeria)
let albumEmEdicao = null; // null = estamos criando um álbum novo
let fotoAberta = null;
let fotoEmEdicao = null;  // null = estamos adicionando fotos novas
let fotoParaExcluir = null;
let versaoGaleria = 0;    // evita que um desenho antigo sobreponha um mais novo

// Ícone que aparece no lugar da capa de um álbum vazio
const ICONE_FOTO =
  '<svg class="icone" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l5-4 4 3 3-2 6 4"/></svg>';

function textoQuantidade(quantidade) {
  return quantidade === 1 ? "1 foto" : quantidade + " fotos";
}

// Diminui a foto antes de enviar (lado maior = 1600 px, JPEG).
// Assim cada foto fica com ~300 a 500 KB e o espaço grátis rende muito.
function comprimirImagem(arquivo, ladoMaximo = 1600, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    const urlTemporaria = URL.createObjectURL(arquivo);
    const imagem = new Image();

    imagem.onload = () => {
      URL.revokeObjectURL(urlTemporaria);

      const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
      const largura = Math.round(imagem.width * escala);
      const altura = Math.round(imagem.height * escala);

      const tela = document.createElement("canvas");
      tela.width = largura;
      tela.height = altura;

      const contexto = tela.getContext("2d");
      contexto.fillStyle = "#17111f"; // fundo para PNGs com transparência
      contexto.fillRect(0, 0, largura, altura);
      contexto.drawImage(imagem, 0, 0, largura, altura);

      tela.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("não consegui reduzir a imagem"))),
        "image/jpeg",
        qualidade
      );
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(urlTemporaria);
      reject(new Error("não consegui ler esta imagem (use JPG, PNG ou WebP)"));
    };

    imagem.src = urlTemporaria;
  });
}

// Envia UMA foto: reduz, guarda no Storage e anota na tabela
async function enviarFoto(arquivo, legenda, dataFoto, albumId) {
  const blob = await comprimirImagem(arquivo);
  const caminho =
    "galeria/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + ".jpg";

  const { error: erroEnvio } = await cliente.storage
    .from("fotos")
    .upload(caminho, blob, { contentType: "image/jpeg", cacheControl: "3600" });

  if (erroEnvio) {
    throw new Error(erroEnvio.message);
  }

  const { data, error: erroSalvar } = await cliente
    .from("galeria")
    .insert({ caminho: caminho, legenda: legenda, data_foto: dataFoto, album_id: albumId })
    .select();

  if (erroSalvar || !data || data.length === 0) {
    // Deu errado ao anotar na tabela: desfaz o envio para não sobrar arquivo perdido
    await cliente.storage.from("fotos").remove([caminho]);
    throw new Error(erroSalvar ? erroSalvar.message : "sem permissão para salvar");
  }
}

// O balde é privado: cada foto precisa de um link temporário (válido por 1 hora)
async function obterLinks(caminhos) {
  const mapa = {};
  if (caminhos.length === 0) return mapa;

  const { data, error } = await cliente.storage.from("fotos").createSignedUrls(caminhos, 3600);
  if (error) {
    throw new Error(error.message);
  }

  data.forEach((link) => {
    if (link.signedUrl) mapa[link.path] = link.signedUrl;
  });
  return mapa;
}

// Monta o quadradinho de UMA foto (com a moldura)
function criarBotaoFoto(foto, url) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "foto-item";

  const imagem = document.createElement("img");
  imagem.loading = "lazy"; // só carrega quando aparece na tela
  imagem.alt = foto.legenda || "Foto do casal";
  imagem.addEventListener("load", () => imagem.classList.add("carregada"));
  imagem.src = url;

  botao.appendChild(imagem);
  botao.addEventListener("click", () => abrirVisualizador(foto, url));
  return botao;
}

// Monta o cartão de UM álbum (capa + nome + quantidade)
function criarCartaoAlbum(album, quantidade, urlCapa) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "album-card";

  const capa = document.createElement("span");
  capa.className = "album-capa";

  if (urlCapa) {
    const imagem = document.createElement("img");
    imagem.loading = "lazy";
    imagem.alt = "";
    imagem.addEventListener("load", () => imagem.classList.add("carregada"));
    imagem.src = urlCapa;
    capa.appendChild(imagem);
  } else {
    capa.innerHTML = ICONE_FOTO; // álbum vazio: mostra um ícone discreto
  }

  const nome = document.createElement("span");
  nome.className = "album-nome";
  nome.textContent = album.nome;

  const contagem = document.createElement("span");
  contagem.className = "album-qtd";
  contagem.textContent = textoQuantidade(quantidade);

  botao.append(capa, nome, contagem);
  botao.addEventListener("click", () => abrirAlbum(album));
  return botao;
}

// Desenha a galeria na tela, de acordo com o álbum aberto (ou não)
async function desenharGaleria(versao) {
  // 1) Cabeçalho
  if (albumAberto) {
    const total = listaFotos.filter((foto) => foto.album_id === albumAberto.id).length;
    tituloGaleria.textContent = albumAberto.nome;
    subtituloGaleria.textContent = albumAberto.descricao || textoQuantidade(total);
  } else {
    tituloGaleria.textContent = "Galeria de Fotos";
    subtituloGaleria.textContent = "Os dias que queremos guardar";
  }
  barraAlbum.classList.toggle("oculto", !albumAberto);
  botaoNovoAlbum.classList.toggle("oculto", !!albumAberto);

  // 2) Quais fotos aparecem na grade
  const fotosDoAlbum = albumAberto
    ? listaFotos.filter((foto) => foto.album_id === albumAberto.id)
    : [];
  const fotosAvulsas = listaFotos.filter((foto) => foto.album_id === null);
  const fotosDaGrade = albumAberto ? fotosDoAlbum : fotosAvulsas;

  // 3) A capa de cada álbum é a foto mais recente dele
  const capas = {};
  if (!albumAberto) {
    listaAlbuns.forEach((album) => {
      capas[album.id] = listaFotos.find((foto) => foto.album_id === album.id) || null;
    });
  }

  // 4) Pede os links temporários só das fotos que vão aparecer
  const caminhos = fotosDaGrade.map((foto) => foto.caminho);
  Object.values(capas).forEach((capa) => {
    if (capa) caminhos.push(capa.caminho);
  });
  const urls = await obterLinks(caminhos);

  if (versao !== versaoGaleria) return; // chegou um pedido mais novo: abandona este

  // 5) Desenha
  gradeAlbuns.innerHTML = "";
  gradeGaleria.innerHTML = "";

  const mostrarAlbuns = !albumAberto && listaAlbuns.length > 0;
  blocoAlbuns.classList.toggle("oculto", !mostrarAlbuns);

  if (mostrarAlbuns) {
    listaAlbuns.forEach((album) => {
      const quantidade = listaFotos.filter((foto) => foto.album_id === album.id).length;
      const capa = capas[album.id];
      const urlCapa = capa ? urls[capa.caminho] : null;
      gradeAlbuns.appendChild(criarCartaoAlbum(album, quantidade, urlCapa));
    });
  }

  const mostrarFotos = fotosDaGrade.length > 0;
  blocoFotos.classList.toggle("oculto", !mostrarFotos);
  // O título "Fotos avulsas" só faz sentido quando também há álbuns na tela
  tituloFotos.classList.toggle("oculto", !(mostrarAlbuns && mostrarFotos));

  fotosDaGrade.forEach((foto) => {
    const url = urls[foto.caminho];
    if (url) gradeGaleria.appendChild(criarBotaoFoto(foto, url));
  });

  // 6) Mensagem quando não há nada para mostrar
  if (albumAberto && fotosDoAlbum.length === 0) {
    statusGaleria.textContent =
      "Este álbum ainda está vazio. Use “Adicionar fotos” para colocar fotos nele.";
  } else if (!albumAberto && listaAlbuns.length === 0 && fotosAvulsas.length === 0) {
    statusGaleria.textContent =
      "Ainda não há fotos nem álbuns. Que tal criar um álbum ou adicionar a primeira foto?";
  } else {
    statusGaleria.textContent = "";
  }
}

// Redesenha a tela da galeria (sem buscar de novo no banco)
async function atualizarTelaGaleria() {
  versaoGaleria++;
  const minhaVersao = versaoGaleria;

  try {
    await desenharGaleria(minhaVersao);
  } catch (problema) {
    if (minhaVersao === versaoGaleria) {
      statusGaleria.textContent = "Não consegui abrir as fotos: " + problema.message;
    }
  }
}

// Busca álbuns e fotos no banco e desenha tudo
async function carregarGaleria() {
  statusGaleria.textContent = "Carregando...";

  const [respostaAlbuns, respostaFotos] = await Promise.all([
    cliente
      .from("albuns")
      .select("id, nome, descricao")
      .order("nome", { ascending: true }),
    cliente
      .from("galeria")
      .select("id, caminho, legenda, data_foto, album_id")
      .order("data_foto", { ascending: false, nullsFirst: false }) // mais recentes primeiro
      .order("criado_em", { ascending: false }),
  ]);

  if (respostaAlbuns.error) {
    statusGaleria.textContent = "Não consegui carregar os álbuns: " + respostaAlbuns.error.message;
    return;
  }
  if (respostaFotos.error) {
    statusGaleria.textContent = "Não consegui carregar as fotos: " + respostaFotos.error.message;
    return;
  }

  listaAlbuns = respostaAlbuns.data;
  listaFotos = respostaFotos.data;

  // Atualiza o álbum aberto (o nome pode ter mudado; ou ele pode ter sido apagado)
  if (albumAberto) {
    albumAberto = listaAlbuns.find((album) => album.id === albumAberto.id) || null;
  }

  atualizarTelaGaleria();
}

// ---------- Abrir e voltar ----------
function abrirAlbum(album) {
  albumAberto = album;
  window.scrollTo(0, 0);
  atualizarTelaGaleria();
}

document.getElementById("botao-voltar-galeria").addEventListener("click", () => {
  albumAberto = null;
  window.scrollTo(0, 0);
  atualizarTelaGaleria();
});

// ---------- Ver a foto grande ----------
function abrirVisualizador(foto, url) {
  fotoAberta = foto;
  imagemVisualizador.src = url;
  imagemVisualizador.alt = foto.legenda || "Foto do casal";

  legendaVisualizador.textContent = foto.legenda || "";
  legendaVisualizador.classList.toggle("oculto", !foto.legenda);

  dataVisualizador.textContent = foto.data_foto ? formatarData(foto.data_foto) : "";
  dataVisualizador.classList.toggle("oculto", !foto.data_foto);

  modalVisualizador.showModal();
}

document.getElementById("botao-fechar-visualizador").addEventListener("click", () => {
  modalVisualizador.close();
});

document.getElementById("botao-editar-foto").addEventListener("click", () => {
  modalVisualizador.close();
  abrirModalEdicaoFoto(fotoAberta);
});

document.getElementById("botao-excluir-foto").addEventListener("click", () => {
  modalVisualizador.close();
  abrirModalExclusaoFoto(fotoAberta);
});

// ---------- Lista de álbuns dentro da janela da foto ----------
function preencherOpcoesAlbum(idSelecionado) {
  campoGaleriaAlbum.innerHTML = "";
  campoGaleriaAlbum.add(new Option("Sem álbum", ""));
  listaAlbuns.forEach((album) => {
    campoGaleriaAlbum.add(new Option(album.nome, String(album.id)));
  });
  campoGaleriaAlbum.value = idSelecionado ? String(idSelecionado) : "";

  // Se ainda não existe nenhum álbum, não faz sentido mostrar a escolha
  grupoAlbum.classList.toggle("oculto", listaAlbuns.length === 0);
}

// ---------- Janela de ADICIONAR fotos ----------
document.getElementById("botao-nova-foto").addEventListener("click", () => {
  fotoEmEdicao = null;
  formGaleria.reset();
  erroGaleria.textContent = "";
  tituloModalGaleria.textContent = "Novas fotos";
  grupoArquivo.classList.remove("oculto");
  dicaGaleria.classList.remove("oculto");
  campoGaleriaArquivo.required = true;
  // Se estamos dentro de um álbum, as fotos novas já vão para ele
  preencherOpcoesAlbum(albumAberto ? albumAberto.id : null);
  modalGaleria.showModal();
});

// ---------- Janela de EDITAR legenda, data e álbum ----------
function abrirModalEdicaoFoto(foto) {
  fotoEmEdicao = foto;
  formGaleria.reset();
  erroGaleria.textContent = "";
  tituloModalGaleria.textContent = "Editar foto";
  grupoArquivo.classList.add("oculto"); // na edição não se troca o arquivo
  dicaGaleria.classList.add("oculto");
  campoGaleriaArquivo.required = false;
  campoGaleriaLegenda.value = foto.legenda || "";
  campoGaleriaData.value = foto.data_foto || "";
  preencherOpcoesAlbum(foto.album_id);
  modalGaleria.showModal();
}

document.getElementById("botao-cancelar-galeria").addEventListener("click", () => {
  modalGaleria.close();
});

// ---------- SALVAR (adicionar fotos novas ou editar uma existente) ----------
formGaleria.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroGaleria.textContent = "";

  const legenda = campoGaleriaLegenda.value.trim() || null;
  const dataFoto = campoGaleriaData.value || null;
  const albumId = campoGaleriaAlbum.value ? Number(campoGaleriaAlbum.value) : null;

  botaoSalvarGaleria.disabled = true;

  // --- Editando uma foto que já existe ---
  if (fotoEmEdicao) {
    botaoSalvarGaleria.textContent = "Salvando...";

    const { data, error } = await cliente
      .from("galeria")
      .update({ legenda: legenda, data_foto: dataFoto, album_id: albumId })
      .eq("id", fotoEmEdicao.id)
      .select();

    botaoSalvarGaleria.disabled = false;
    botaoSalvarGaleria.textContent = "Salvar";

    if (error) {
      erroGaleria.textContent = "Não consegui salvar: " + error.message;
      return;
    }
    if (data.length === 0) {
      erroGaleria.textContent = "Não foi possível salvar. Confira as permissões no Supabase.";
      return;
    }

    modalGaleria.close();
    carregarGaleria();
    return;
  }

  // --- Enviando fotos novas ---
  const arquivos = Array.from(campoGaleriaArquivo.files);

  if (arquivos.length === 0) {
    erroGaleria.textContent = "Escolha pelo menos uma foto.";
    botaoSalvarGaleria.disabled = false;
    return;
  }

  let enviadas = 0;

  for (const arquivo of arquivos) {
    botaoSalvarGaleria.textContent = "Enviando " + (enviadas + 1) + " de " + arquivos.length + "...";

    try {
      await enviarFoto(arquivo, legenda, dataFoto, albumId);
      enviadas++;
    } catch (problema) {
      erroGaleria.textContent =
        "Não consegui enviar “" + arquivo.name + "”: " + problema.message +
        (enviadas > 0 ? " (" + enviadas + " foto(s) já foram enviadas.)" : "");
      break;
    }
  }

  botaoSalvarGaleria.disabled = false;
  botaoSalvarGaleria.textContent = "Salvar";

  if (enviadas > 0) {
    carregarGaleria();
  }
  if (enviadas === arquivos.length) {
    modalGaleria.close();
  }
});

// ---------- EXCLUIR foto (com confirmação) ----------
function abrirModalExclusaoFoto(foto) {
  fotoParaExcluir = foto;
  erroConfirmarFoto.textContent = "";
  modalConfirmarFoto.showModal();
}

document.getElementById("botao-cancelar-exclusao-foto").addEventListener("click", () => {
  modalConfirmarFoto.close();
});

botaoConfirmarExclusaoFoto.addEventListener("click", async () => {
  erroConfirmarFoto.textContent = "";
  botaoConfirmarExclusaoFoto.disabled = true;
  botaoConfirmarExclusaoFoto.textContent = "Excluindo...";

  // 1) Tira da lista (tabela)
  const { data, error } = await cliente
    .from("galeria")
    .delete()
    .eq("id", fotoParaExcluir.id)
    .select();

  if (error || data.length === 0) {
    botaoConfirmarExclusaoFoto.disabled = false;
    botaoConfirmarExclusaoFoto.textContent = "Excluir";
    erroConfirmarFoto.textContent = error
      ? "Não consegui excluir: " + error.message
      : "Não foi possível excluir. Confira as permissões no Supabase.";
    return;
  }

  // 2) Apaga o arquivo da imagem para liberar espaço
  const { error: erroArquivo } = await cliente.storage
    .from("fotos")
    .remove([fotoParaExcluir.caminho]);

  if (erroArquivo) {
    console.warn("A foto saiu da galeria, mas o arquivo não foi apagado:", erroArquivo.message);
  }

  botaoConfirmarExclusaoFoto.disabled = false;
  botaoConfirmarExclusaoFoto.textContent = "Excluir";
  modalConfirmarFoto.close();
  carregarGaleria();
});

// ---------- Janela de CRIAR álbum ----------
botaoNovoAlbum.addEventListener("click", () => {
  albumEmEdicao = null; // null = álbum novo
  formAlbum.reset();
  erroAlbum.textContent = "";
  tituloModalAlbum.textContent = "Novo álbum";
  modalAlbum.showModal();
});

// ---------- Janela de EDITAR álbum (nome e descrição) ----------
document.getElementById("botao-editar-album").addEventListener("click", () => {
  albumEmEdicao = albumAberto;
  erroAlbum.textContent = "";
  tituloModalAlbum.textContent = "Editar álbum";
  campoAlbumNome.value = albumAberto.nome;
  campoAlbumDescricao.value = albumAberto.descricao || "";
  modalAlbum.showModal();
});

document.getElementById("botao-cancelar-album").addEventListener("click", () => {
  modalAlbum.close();
});

// ---------- SALVAR álbum (criar ou editar) ----------
formAlbum.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroAlbum.textContent = "";
  botaoSalvarAlbum.disabled = true;
  botaoSalvarAlbum.textContent = "Salvando...";

  const dados = {
    nome: campoAlbumNome.value.trim(),
    descricao: campoAlbumDescricao.value.trim() || null,
  };

  let resposta;
  if (albumEmEdicao) {
    resposta = await cliente
      .from("albuns")
      .update(dados)
      .eq("id", albumEmEdicao.id)
      .select();
  } else {
    resposta = await cliente.from("albuns").insert(dados).select();
  }

  botaoSalvarAlbum.disabled = false;
  botaoSalvarAlbum.textContent = "Salvar";

  if (resposta.error) {
    erroAlbum.textContent = "Não consegui salvar: " + resposta.error.message;
    return;
  }
  if (resposta.data.length === 0) {
    erroAlbum.textContent = "Não foi possível salvar. Confira as permissões no Supabase.";
    return;
  }

  // Álbum recém-criado: já abre ele, pronto para receber fotos
  if (!albumEmEdicao) {
    albumAberto = resposta.data[0];
    window.scrollTo(0, 0);
  }

  modalAlbum.close();
  carregarGaleria();
});

// ---------- EXCLUIR álbum (as fotos NÃO são apagadas) ----------
document.getElementById("botao-excluir-album").addEventListener("click", () => {
  erroConfirmarAlbum.textContent = "";
  textoConfirmarAlbum.textContent =
    "O álbum “" + albumAberto.nome + "” será apagado. As fotos dele não serão apagadas: " +
    "elas voltam para a galeria, sem álbum.";
  modalConfirmarAlbum.showModal();
});

document.getElementById("botao-cancelar-exclusao-album").addEventListener("click", () => {
  modalConfirmarAlbum.close();
});

botaoConfirmarExclusaoAlbum.addEventListener("click", async () => {
  erroConfirmarAlbum.textContent = "";
  botaoConfirmarExclusaoAlbum.disabled = true;
  botaoConfirmarExclusaoAlbum.textContent = "Excluindo...";

  const { data, error } = await cliente
    .from("albuns")
    .delete()
    .eq("id", albumAberto.id)
    .select();

  botaoConfirmarExclusaoAlbum.disabled = false;
  botaoConfirmarExclusaoAlbum.textContent = "Excluir";

  if (error) {
    erroConfirmarAlbum.textContent = "Não consegui excluir: " + error.message;
    return;
  }
  if (data.length === 0) {
    erroConfirmarAlbum.textContent = "Não foi possível excluir. Confira as permissões no Supabase.";
    return;
  }

  albumAberto = null; // volta para a tela principal da galeria
  modalConfirmarAlbum.close();
  window.scrollTo(0, 0);
  carregarGaleria();
});

// =====================================================
// CÁPSULA DO TEMPO (CARTAS COM SENHA)
//
// IMPORTANTE: o texto da carta e a senha nunca são lidos
// direto da tabela. O site só lista a "capa" (título, dica,
// data) e pede o texto à função abrir_carta, que confere
// a senha e a data DENTRO do banco de dados.
// =====================================================
const statusCartas = document.getElementById("cartas-status");
const blocoCartasParaMim = document.getElementById("bloco-cartas-para-mim");
const gradeCartasParaMim = document.getElementById("cartas-para-mim");
const blocoCartasMinhas = document.getElementById("bloco-cartas-minhas");
const gradeCartasMinhas = document.getElementById("cartas-minhas");

// Janela de ver/abrir uma carta
const modalCarta = document.getElementById("modal-carta");
const cartaStatus = document.getElementById("carta-status");
const cartaTitulo = document.getElementById("carta-titulo");
const cartaMeta = document.getElementById("carta-meta");
const cartaDica = document.getElementById("carta-dica");
const formSenhaCarta = document.getElementById("form-senha-carta");
const campoSenhaCarta = document.getElementById("carta-senha");
const erroSenhaCarta = document.getElementById("carta-erro");
const botaoAbrirCarta = document.getElementById("botao-abrir-carta");
const cartaLeitura = document.getElementById("carta-leitura");
const botaoEditarCarta = document.getElementById("botao-editar-carta");
const botaoExcluirCarta = document.getElementById("botao-excluir-carta");

// Janela de escrever/editar uma carta
const modalEscreverCarta = document.getElementById("modal-escrever-carta");
const formCarta = document.getElementById("form-carta");
const tituloModalEscreverCarta = document.getElementById("modal-titulo-escrever-carta");
const campoCartaTitulo = document.getElementById("carta-campo-titulo");
const campoCartaTexto = document.getElementById("carta-campo-texto");
const campoCartaSenha = document.getElementById("carta-campo-senha");
const campoCartaDica = document.getElementById("carta-campo-dica");
const campoCartaData = document.getElementById("carta-campo-data");
const botaoSalvarCarta = document.getElementById("botao-salvar-carta");
const erroCarta = document.getElementById("carta-form-erro");

// Janela de confirmar exclusão da carta
const modalConfirmarCarta = document.getElementById("modal-confirmar-carta");
const textoConfirmarCarta = document.getElementById("confirmar-carta-texto");
const botaoConfirmarExclusaoCarta = document.getElementById("botao-confirmar-exclusao-carta");
const erroConfirmarCarta = document.getElementById("confirmar-carta-erro");

const FUSO_BRASIL = "America/Sao_Paulo";

const ICONE_CADEADO =
  '<svg class="icone" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

const ICONE_ENVELOPE =
  '<svg class="icone" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';

let meuIdUsuario = null; // quem está logado agora
let cartaAberta = null;  // carta que está aberta na janela
let cartaEmEdicao = null; // null = estamos escrevendo uma carta nova
let listaCartas = [];     // todas as cartas (a "capa" de cada uma)
let filtroCartas = "todas"; // tipo escolhido no filtro

// Tipos de carta: nome guardado no banco -> texto que aparece na tela
const CATEGORIAS_CARTA = {
  normal: "Carta Normal",
  saudade: "Abra quando sentir saudade",
  triste: "Abra quando estiver triste",
  data_especial: "Abra em uma data especial",
  brigar: "Abra se a gente brigar",
};

const barraFiltroCartas = document.getElementById("filtro-cartas");
const cartaTag = document.getElementById("carta-tag");
const campoCartaCategoria = document.getElementById("carta-campo-categoria");

// Escreve o tipo da carta dentro de uma etiqueta (tag)
function aplicarTagCategoria(elemento, categoria) {
  const chave = CATEGORIAS_CARTA[categoria] ? categoria : "normal";
  elemento.textContent = CATEGORIAS_CARTA[chave];
  elemento.className = "carta-tag" + (chave === "normal" ? " normal" : "");
}

function criarTagCategoria(categoria) {
  const tag = document.createElement("span");
  aplicarTagCategoria(tag, categoria);
  return tag;
}

// Clique nos botões do filtro (Todas, Saudade, Triste...)
barraFiltroCartas.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-filtro]");
  if (!botao) return;

  filtroCartas = botao.dataset.filtro;
  barraFiltroCartas.querySelectorAll("[data-filtro]").forEach((outro) => {
    outro.classList.toggle("ativo", outro === botao);
  });
  desenharCartas();
});

// ---------- Funções de data (sempre no horário de Brasília) ----------

// Devolve "2026-11-24" (ano-mês-dia) no horário de Brasília
function dataBrasil(valor) {
  return new Date(valor).toLocaleDateString("sv-SE", { timeZone: FUSO_BRASIL });
}

// Devolve "24 de novembro de 2026"
function formatarDataCarta(valor) {
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: FUSO_BRASIL,
  });
}

function cartaEstaTrancada(carta) {
  return new Date(carta.abrir_em) > new Date();
}

// Devolve "amanhã" ou "em 12 dias"
function textoPrazo(carta) {
  const [anoHoje, mesHoje, diaHoje] = dataBrasil(new Date()).split("-").map(Number);
  const [anoAbre, mesAbre, diaAbre] = dataBrasil(carta.abrir_em).split("-").map(Number);
  const milissegundos = Date.UTC(anoAbre, mesAbre - 1, diaAbre) - Date.UTC(anoHoje, mesHoje - 1, diaHoje);
  const dias = Math.max(1, Math.round(milissegundos / 86400000));
  return dias === 1 ? "amanhã" : "em " + dias + " dias";
}

// Liberadas primeiro (as mais recentes no topo), depois as trancadas (as que abrem antes primeiro)
function ordenarCartas(lista) {
  const liberadas = lista
    .filter((carta) => !cartaEstaTrancada(carta))
    .sort((a, b) => new Date(b.abrir_em) - new Date(a.abrir_em));
  const trancadas = lista
    .filter((carta) => cartaEstaTrancada(carta))
    .sort((a, b) => new Date(a.abrir_em) - new Date(b.abrir_em));
  return liberadas.concat(trancadas);
}

// ---------- Desenhar a lista ----------
function criarCartaoCarta(carta) {
  const minha = carta.autor_id === meuIdUsuario;
  const trancada = cartaEstaTrancada(carta);

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "carta-card";

  const topo = document.createElement("span");
  topo.className = "carta-topo";

  const icone = document.createElement("span");
  icone.innerHTML = trancada && !minha ? ICONE_CADEADO : ICONE_ENVELOPE; // desenho fixo, sem texto de usuário

  const status = document.createElement("span");
  status.className = "carta-status";
  status.textContent = minha ? "Escrita por você" : trancada ? "Trancada" : "Pronta para abrir";

  topo.append(icone, status);

  const tag = criarTagCategoria(carta.categoria);

  const titulo = document.createElement("span");
  titulo.className = "carta-card-titulo";
  titulo.textContent = carta.titulo;

  const detalhe = document.createElement("span");
  detalhe.className = "carta-card-detalhe";
  detalhe.textContent = trancada
    ? "Abre " + textoPrazo(carta) + " · " + formatarDataCarta(carta.abrir_em)
    : "Liberada em " + formatarDataCarta(carta.abrir_em);

  botao.append(topo, tag, titulo, detalhe);

  if (carta.dica) {
    const dica = document.createElement("span");
    dica.className = "carta-card-dica";
    dica.textContent = "Dica: " + carta.dica;
    botao.appendChild(dica);
  }

  botao.addEventListener("click", () => abrirCartaNaTela(carta));
  return botao;
}

// Busca as cartas no banco (só a "capa") e desenha
async function carregarCartas() {
  statusCartas.textContent = "Carregando...";

  const { data: sessao } = await cliente.auth.getSession();
  meuIdUsuario = sessao.session ? sessao.session.user.id : null;

  // Pedimos as colunas uma a uma: o texto e a senha não podem ser lidos daqui
  const { data, error } = await cliente
    .from("cartas")
    .select("id, autor_id, titulo, dica, abrir_em, criado_em, categoria");

  if (error) {
    statusCartas.textContent = "Não consegui carregar as cartas: " + error.message;
    return;
  }

  listaCartas = data;
  desenharCartas();
}

// Desenha as cartas na tela, respeitando o tipo escolhido no filtro
function desenharCartas() {
  const visiveis =
    filtroCartas === "todas"
      ? listaCartas
      : listaCartas.filter((carta) => (carta.categoria || "normal") === filtroCartas);

  const paraMim = ordenarCartas(visiveis.filter((carta) => carta.autor_id !== meuIdUsuario));
  const minhas = ordenarCartas(visiveis.filter((carta) => carta.autor_id === meuIdUsuario));

  gradeCartasParaMim.innerHTML = "";
  gradeCartasMinhas.innerHTML = "";

  paraMim.forEach((carta) => gradeCartasParaMim.appendChild(criarCartaoCarta(carta)));
  minhas.forEach((carta) => gradeCartasMinhas.appendChild(criarCartaoCarta(carta)));

  blocoCartasParaMim.classList.toggle("oculto", paraMim.length === 0);
  blocoCartasMinhas.classList.toggle("oculto", minhas.length === 0);

  // O filtro só aparece quando já existe alguma carta
  barraFiltroCartas.classList.toggle("oculto", listaCartas.length === 0);

  if (listaCartas.length === 0) {
    statusCartas.textContent = "Ainda não há cartas. Que tal escrever a primeira?";
  } else if (visiveis.length === 0) {
    statusCartas.textContent = "Nenhuma carta deste tipo por enquanto.";
  } else {
    statusCartas.textContent = "";
  }
}

// ---------- Abrir uma carta ----------

// Pergunta ao banco se esta senha abre esta carta
async function pedirConteudoCarta(id, senha) {
  const { data, error } = await cliente.rpc("abrir_carta", { p_id: id, p_senha: senha });
  if (error) {
    throw new Error(error.message);
  }
  return data; // { ok: true, conteudo: "..." } ou { ok: false, motivo: "..." }
}

// Mostra o texto da carta na janela
function mostrarLeituraCarta(conteudo) {
  const minha = cartaAberta.autor_id === meuIdUsuario;

  cartaAberta.conteudo = conteudo;
  cartaLeitura.textContent = conteudo;
  cartaLeitura.classList.remove("oculto");
  formSenhaCarta.classList.add("oculto");

  cartaMeta.textContent =
    "Escrita em " + formatarDataCarta(cartaAberta.criado_em) +
    (minha && cartaEstaTrancada(cartaAberta)
      ? " · Será liberada em " + formatarDataCarta(cartaAberta.abrir_em)
      : "");

  // Só quem escreveu pode editar ou excluir
  botaoEditarCarta.classList.toggle("oculto", !minha);
  botaoExcluirCarta.classList.toggle("oculto", !minha);
}

async function abrirCartaNaTela(carta) {
  const minha = carta.autor_id === meuIdUsuario;
  const trancada = cartaEstaTrancada(carta);

  cartaAberta = { ...carta, conteudo: null };

  // Começa com tudo "limpo"
  erroSenhaCarta.textContent = "";
  campoSenhaCarta.value = "";
  cartaLeitura.classList.add("oculto");
  cartaLeitura.textContent = "";
  formSenhaCarta.classList.add("oculto");
  botaoEditarCarta.classList.add("oculto");
  botaoExcluirCarta.classList.add("oculto");

  cartaTitulo.textContent = carta.titulo;
  aplicarTagCategoria(cartaTag, carta.categoria);
  cartaStatus.textContent = minha ? "Escrita por você" : trancada ? "Trancada" : "Carta para você";

  cartaDica.textContent = carta.dica ? "Dica: " + carta.dica : "";
  cartaDica.classList.toggle("oculto", !carta.dica);

  if (minha) {
    // Quem escreveu lê sem senha
    cartaMeta.textContent = "Abrindo...";
    modalCarta.showModal();
    try {
      const resultado = await pedirConteudoCarta(carta.id, "");
      if (resultado.ok) {
        mostrarLeituraCarta(resultado.conteudo);
      } else {
        cartaMeta.textContent = "Não consegui abrir a carta.";
      }
    } catch (problema) {
      cartaMeta.textContent = "Não consegui abrir a carta: " + problema.message;
    }
    return;
  }

  if (trancada) {
    cartaMeta.textContent =
      "Esta carta só será liberada em " + formatarDataCarta(carta.abrir_em) +
      " (" + textoPrazo(carta) + "). Até lá, ela fica trancada.";
    modalCarta.showModal();
    return;
  }

  // Liberada, mas precisa da senha
  cartaMeta.textContent = "Digite a senha para ler esta carta.";
  formSenhaCarta.classList.remove("oculto");
  modalCarta.showModal();
  campoSenhaCarta.focus();
}

formSenhaCarta.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroSenhaCarta.textContent = "";
  botaoAbrirCarta.disabled = true;
  botaoAbrirCarta.textContent = "Abrindo...";

  try {
    const resultado = await pedirConteudoCarta(cartaAberta.id, campoSenhaCarta.value);

    if (resultado.ok) {
      mostrarLeituraCarta(resultado.conteudo);
      return;
    }

    if (resultado.motivo === "senha_incorreta") {
      erroSenhaCarta.textContent = "Senha incorreta. Releia a dica e tente de novo.";
    } else if (resultado.motivo === "trancada") {
      erroSenhaCarta.textContent = "Esta carta ainda está trancada.";
    } else {
      erroSenhaCarta.textContent = "Não encontrei esta carta.";
    }
    campoSenhaCarta.value = "";
    campoSenhaCarta.focus();
  } catch (problema) {
    erroSenhaCarta.textContent = "Não consegui abrir: " + problema.message;
  } finally {
    botaoAbrirCarta.disabled = false;
    botaoAbrirCarta.textContent = "Abrir carta";
  }
});

document.getElementById("botao-cancelar-senha-carta").addEventListener("click", () => {
  modalCarta.close();
});

document.getElementById("botao-fechar-carta").addEventListener("click", () => {
  modalCarta.close();
});

// Ao fechar a janela, apaga o texto da tela
modalCarta.addEventListener("close", () => {
  cartaLeitura.textContent = "";
  campoSenhaCarta.value = "";
});

// ---------- Escrever uma carta nova ----------
document.getElementById("botao-nova-carta").addEventListener("click", () => {
  cartaEmEdicao = null; // null = carta nova
  formCarta.reset();
  erroCarta.textContent = "";
  tituloModalEscreverCarta.textContent = "Nova carta";
  campoCartaSenha.required = true;
  campoCartaSenha.placeholder = "A senha que quem receber vai digitar";
  campoCartaData.value = dataBrasil(new Date()); // sugestão: hoje
  modalEscreverCarta.showModal();
});

// ---------- Editar uma carta (só a sua) ----------
botaoEditarCarta.addEventListener("click", () => {
  cartaEmEdicao = cartaAberta;
  modalCarta.close();

  formCarta.reset();
  erroCarta.textContent = "";
  tituloModalEscreverCarta.textContent = "Editar carta";
  campoCartaTitulo.value = cartaEmEdicao.titulo;
  campoCartaTexto.value = cartaEmEdicao.conteudo || "";
  campoCartaDica.value = cartaEmEdicao.dica || "";
  campoCartaData.value = dataBrasil(cartaEmEdicao.abrir_em);
  campoCartaCategoria.value = cartaEmEdicao.categoria || "normal";
  campoCartaSenha.required = false;
  campoCartaSenha.placeholder = "Deixe em branco para manter a senha atual";
  modalEscreverCarta.showModal();
});

document.getElementById("botao-cancelar-carta").addEventListener("click", () => {
  modalEscreverCarta.close();
});

// ---------- SALVAR (carta nova ou editada) ----------
formCarta.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroCarta.textContent = "";
  botaoSalvarCarta.disabled = true;
  botaoSalvarCarta.textContent = "Salvando...";

  // A carta abre à meia-noite do dia escolhido, no horário de Brasília (-03:00)
  const abrirEm = campoCartaData.value + "T00:00:00-03:00";
  const dica = campoCartaDica.value.trim() || null;
  const senha = campoCartaSenha.value.trim();

  let resposta;
  if (cartaEmEdicao) {
    resposta = await cliente.rpc("editar_carta", {
      p_id: cartaEmEdicao.id,
      p_titulo: campoCartaTitulo.value.trim(),
      p_conteudo: campoCartaTexto.value,
      p_dica: dica,
      p_abrir_em: abrirEm,
      p_nova_senha: senha || null, // vazio = mantém a senha atual
      p_categoria: campoCartaCategoria.value,
    });
  } else {
    resposta = await cliente.rpc("criar_carta", {
      p_titulo: campoCartaTitulo.value.trim(),
      p_conteudo: campoCartaTexto.value,
      p_senha: senha,
      p_dica: dica,
      p_abrir_em: abrirEm,
      p_categoria: campoCartaCategoria.value,
    });
  }

  botaoSalvarCarta.disabled = false;
  botaoSalvarCarta.textContent = "Salvar";

  if (resposta.error) {
    // As mensagens do banco já vêm em português (ex.: "A senha precisa ter pelo menos 3 caracteres.")
    erroCarta.textContent = resposta.error.message;
    return;
  }

  modalEscreverCarta.close();
  carregarCartas();
});

// ---------- EXCLUIR carta (com confirmação) ----------
botaoExcluirCarta.addEventListener("click", () => {
  modalCarta.close();
  erroConfirmarCarta.textContent = "";
  textoConfirmarCarta.textContent =
    "“" + cartaAberta.titulo + "” será apagada para sempre. Essa ação não pode ser desfeita.";
  modalConfirmarCarta.showModal();
});

document.getElementById("botao-cancelar-exclusao-carta").addEventListener("click", () => {
  modalConfirmarCarta.close();
});

botaoConfirmarExclusaoCarta.addEventListener("click", async () => {
  erroConfirmarCarta.textContent = "";
  botaoConfirmarExclusaoCarta.disabled = true;
  botaoConfirmarExclusaoCarta.textContent = "Excluindo...";

  // select("id"): pedimos só o id de volta (as outras colunas são protegidas)
  const { data, error } = await cliente
    .from("cartas")
    .delete()
    .eq("id", cartaAberta.id)
    .select("id");

  botaoConfirmarExclusaoCarta.disabled = false;
  botaoConfirmarExclusaoCarta.textContent = "Excluir";

  if (error) {
    erroConfirmarCarta.textContent = "Não consegui excluir: " + error.message;
    return;
  }
  if (data.length === 0) {
    erroConfirmarCarta.textContent = "Não foi possível excluir. Só quem escreveu a carta pode apagá-la.";
    return;
  }

  modalConfirmarCarta.close();
  carregarCartas();
});

// =====================================================
// FOTO PRINCIPAL (página inicial)
// O arquivo fica no balde "fotos" (privado) e o caminho dele
// fica guardado na tabela site_settings, na chave "foto_principal".
// =====================================================
const fotoPrincipalMoldura = document.getElementById("foto-principal-moldura");
const fotoPrincipalImg = document.getElementById("foto-principal-img");
const fotoPrincipalPlaceholder = document.getElementById("foto-principal-placeholder");
const fotoPrincipalStatus = document.getElementById("foto-principal-status");
const fotoPrincipalArquivo = document.getElementById("foto-principal-arquivo");
const botaoTrocarFotoPrincipal = document.getElementById("botao-trocar-foto-principal");

let fotoPrincipalCaminho = null; // caminho do arquivo que está na tela
let fotoPrincipalHora = 0;       // quando o link temporário foi pedido

// Volta para o quadro cinza ("Nossa foto principal")
function mostrarFotoPrincipalVazia() {
  fotoPrincipalCaminho = null;
  fotoPrincipalHora = 0;
  fotoPrincipalImg.removeAttribute("src");
  fotoPrincipalMoldura.classList.add("oculto");
  fotoPrincipalPlaceholder.classList.remove("oculto");
  botaoTrocarFotoPrincipal.textContent = "Escolher foto";
}

// Descobre qual é a foto principal e mostra na tela
async function carregarFotoPrincipal(forcar = false) {
  const { data: sessao } = await cliente.auth.getSession();
  if (!sessao.session) return; // ninguém logado: não busca nada

  const { data, error } = await cliente
    .from("site_settings")
    .select("valor")
    .eq("chave", "foto_principal")
    .maybeSingle(); // pode não existir ainda (nenhuma foto escolhida)

  if (error) {
    fotoPrincipalStatus.textContent = "Não consegui carregar a foto principal: " + error.message;
    return;
  }

  const caminho = data && data.valor ? data.valor : null;

  if (!caminho) {
    mostrarFotoPrincipalVazia();
    return;
  }

  // Se já está na tela e o link ainda vale, não precisa buscar de novo
  const linkAindaValido = Date.now() - fotoPrincipalHora < 40 * 60 * 1000;
  if (!forcar && caminho === fotoPrincipalCaminho && linkAindaValido) return;

  // O balde é privado: pedimos um link temporário (1 hora)
  const { data: link, error: erroLink } = await cliente.storage
    .from("fotos")
    .createSignedUrl(caminho, 3600);

  if (erroLink || !link) {
    fotoPrincipalStatus.textContent =
      "Não consegui abrir a foto principal: " + (erroLink ? erroLink.message : "arquivo não encontrado");
    return;
  }

  fotoPrincipalCaminho = caminho;
  fotoPrincipalHora = Date.now();
  fotoPrincipalStatus.textContent = "";

  fotoPrincipalImg.onload = () => {
    fotoPrincipalMoldura.classList.remove("oculto");
    fotoPrincipalPlaceholder.classList.add("oculto");
  };
  fotoPrincipalImg.onerror = () => {
    fotoPrincipalStatus.textContent = "Não consegui abrir a foto principal.";
  };
  fotoPrincipalImg.src = link.signedUrl;
  botaoTrocarFotoPrincipal.textContent = "Trocar foto";
}

// O botão só "clica" no seletor de arquivo (que fica escondido)
botaoTrocarFotoPrincipal.addEventListener("click", () => {
  fotoPrincipalArquivo.click();
});

// Quando uma foto é escolhida: reduz, envia, anota e atualiza a tela
fotoPrincipalArquivo.addEventListener("change", async () => {
  const arquivo = fotoPrincipalArquivo.files[0];
  fotoPrincipalArquivo.value = ""; // permite escolher o mesmo arquivo outra vez depois
  if (!arquivo) return;

  fotoPrincipalStatus.textContent = "Enviando foto...";
  botaoTrocarFotoPrincipal.disabled = true;

  const novoCaminho =
    "principal/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + ".jpg";

  try {
    // 1) Descobre qual era a foto anterior (para apagar depois e liberar espaço)
    const { data: atual } = await cliente
      .from("site_settings")
      .select("valor")
      .eq("chave", "foto_principal")
      .maybeSingle();
    const caminhoAntigo = atual && atual.valor ? atual.valor : null;

    // 2) Reduz e envia a foto nova
    const blob = await comprimirImagem(arquivo);
    const { error: erroEnvio } = await cliente.storage
      .from("fotos")
      .upload(novoCaminho, blob, { contentType: "image/jpeg", cacheControl: "3600" });

    if (erroEnvio) {
      throw new Error(erroEnvio.message);
    }

    // 3) Anota o novo caminho (cria a linha se não existir, ou atualiza)
    const { data, error: erroSalvar } = await cliente
      .from("site_settings")
      .upsert({ chave: "foto_principal", valor: novoCaminho }, { onConflict: "chave" })
      .select();

    if (erroSalvar || !data || data.length === 0) {
      await cliente.storage.from("fotos").remove([novoCaminho]); // desfaz o envio
      throw new Error(erroSalvar ? erroSalvar.message : "sem permissão para salvar");
    }

    // 4) Apaga a foto antiga (se havia) e mostra a nova
    if (caminhoAntigo) {
      await cliente.storage.from("fotos").remove([caminhoAntigo]);
    }
    await carregarFotoPrincipal(true);
    fotoPrincipalStatus.textContent = "";
  } catch (problema) {
    fotoPrincipalStatus.textContent = "Não consegui trocar a foto: " + problema.message;
  } finally {
    botaoTrocarFotoPrincipal.disabled = false;
  }
});

// Carrega a foto quando alguém entra; limpa quando sai
cliente.auth.onAuthStateChange((evento, sessao) => {
  if (sessao) {
    // setTimeout evita travar a biblioteca do Supabase dentro deste "vigia"
    setTimeout(() => carregarFotoPrincipal(), 0);
  } else {
    mostrarFotoPrincipalVazia();
    fotoPrincipalStatus.textContent = "";
  }
});

// ---------- Clicar fora de qualquer janela fecha ela ----------
document.querySelectorAll("dialog.modal").forEach((modal) => {
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) {
      modal.close();
    }
  });
});
