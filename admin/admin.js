/* =====================================================================
   PAINEL DA ANA PAULA
   1. Confere a sessão antes de mostrar qualquer coisa.
   2. Cada aba busca os próprios dados. Se uma tabela faltar, a aba avisa
      e o resto do painel continua funcionando.
   ===================================================================== */
(async function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const B = window.Biblioteca || null;
  const banco = window.criarBanco ? window.criarBanco(true) : null;

  /* ---------- 1. Conferir a sessão (sempre a primeira coisa) ---------- */
  if (!banco) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Não consegui carregar a ligação com o banco. Confira a internet e recarregue a página.</p>';
    return;
  }
  let sessao = null;
  try {
    const r = await banco.auth.getSession();
    sessao = r.data && r.data.session;
  } catch (erro) { sessao = null; }
  if (!sessao) { location.replace("../login/"); return; }

  $("app").hidden = false;
  $("menuEmail").textContent = sessao.user && sessao.user.email ? sessao.user.email : "";
  banco.auth.onAuthStateChange((evento, s) => {
    if (evento === "SIGNED_OUT" || (!s && evento !== "INITIAL_SESSION")) location.replace("../login/");
  });

  /* ---------- Ajudantes ---------- */
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const paraData = (s) => { if (!s) return null; const p = String(s).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const hojeISO = () => iso(new Date());
  const diasAte = (s) => { const d = paraData(s); if (!d) return null; const h = paraData(hojeISO()); return Math.round((d - h) / 86400000); };
  const fmtData = (s) => { const d = paraData(s); return d ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() : ""; };
  const fmtDia = (s) => { const d = paraData(s); return d ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) : ""; };
  const dinheiro = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const numero = (n) => (Number(n) || 0).toLocaleString("pt-BR");
  const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
  const ICONE = {
    olho: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    olhoFechado: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    lapis: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
    lixo: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    alca: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
    mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    baixar: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    whats: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/></svg>',
    estrela: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
    esquerda: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    direita: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>'
  };

  /* Aviso rápido no rodapé da tela */
  let tempoAviso;
  function avisoRapido(texto) {
    const el = $("avisoRapido");
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* Avisos fixos: o que faltou no banco */
  const faltando = {};
  function atualizarAvisos() {
    $("avisos").innerHTML = Object.keys(faltando).map((t) => '<div class="aviso">' + esc(faltando[t]) + "</div>").join("");
  }
  function traduzirErro(tabela, e) {
    const msg = String((e && (e.message || e.details || e.hint)) || "");
    const codigo = e && e.code;
    if (codigo === "42P01" || codigo === "PGRST205" || /does not exist|could not find the table|schema cache/i.test(msg)) {
      return 'A tabela "' + tabela + '" ainda não existe no banco. Rode o banco.sql no Supabase. O resto do painel continua funcionando.';
    }
    if (codigo === "42703" || codigo === "PGRST204" || /column/i.test(msg)) {
      const campo = (msg.match(/column\s+"?([\w.]+)"?/i) || msg.match(/'([\w]+)' column/i) || [])[1];
      return 'Falta um campo na tabela "' + tabela + '"' + (campo ? " (" + campo + ")" : "") + ". Rode o banco.sql de novo para completar.";
    }
    if (codigo === "42501" || /permission|policy|jwt/i.test(msg)) {
      return 'O banco não deixou abrir a tabela "' + tabela + '". Confira se entrou com o e-mail certo e se o banco.sql foi rodado.';
    }
    if (/fetch|network/i.test(msg)) return "Sem conexão com o banco agora. Confira a internet e recarregue.";
    return 'Não consegui ler a tabela "' + tabela + '". Detalhe: ' + msg;
  }

  /* Ler uma tabela. Nunca quebra: devolve lista vazia e mostra o aviso. */
  async function ler(tabela, montar) {
    try {
      const { data, error } = await montar(banco.from(tabela));
      if (error) throw error;
      delete faltando[tabela];
      atualizarAvisos();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      faltando[tabela] = traduzirErro(tabela, e);
      atualizarAvisos();
      return [];
    }
  }
  /* Gravar (inserir, editar, apagar). Devolve true quando deu certo. */
  async function gravar(tabela, montar, textoOk) {
    try {
      const { error } = await montar(banco.from(tabela));
      if (error) throw error;
      if (textoOk) avisoRapido(textoOk);
      return true;
    } catch (e) {
      avisoRapido("Não salvou. " + traduzirErro(tabela, e));
      return false;
    }
  }

  /* Baixar uma lista em CSV que abre certinho no Excel (com acento) */
  function baixarCSV(nomeArquivo, cabecalho, linhas) {
    const celula = (v) => {
      const t = String(v == null ? "" : v).replace(/\r?\n/g, " ");
      return /[";]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const texto = "﻿" + [cabecalho].concat(linhas).map((l) => l.map(celula).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo + "-" + hojeISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- Janela (formulários e fichas) ---------- */
  const janela = $("janela");
  function abrirJanela(opcoes) {
    $("janelaTitulo").textContent = opcoes.titulo || "";
    $("janelaCorpo").innerHTML = opcoes.corpo || "";
    const rodape = $("janelaRodape");
    rodape.innerHTML = "";
    (opcoes.botoes || []).forEach((b) => {
      const el = document.createElement(b.link ? "a" : "button");
      if (b.link) { el.href = b.link; el.target = "_blank"; el.rel = "noopener"; } else { el.type = "button"; }
      el.className = "botao " + (b.classe || "") + (b.esquerda ? " esquerda" : "");
      el.innerHTML = b.texto;
      if (b.acao) el.addEventListener("click", () => b.acao(el));
      rodape.appendChild(el);
    });
    rodape.hidden = !(opcoes.botoes && opcoes.botoes.length);
    janela.classList.toggle("larga", !!opcoes.larga);
    if (!janela.open) janela.showModal();
    if (opcoes.aoAbrir) opcoes.aoAbrir($("janelaCorpo"));
    const primeiro = $("janelaCorpo").querySelector("input, select, textarea");
    if (primeiro) primeiro.focus();
  }
  function fecharJanela() { if (janela.open) janela.close(); }
  $("janelaFechar").addEventListener("click", fecharJanela);
  janela.addEventListener("click", (e) => { if (e.target === janela) fecharJanela(); });

  /* Formulário genérico */
  function formulario(cfg) {
    const v = cfg.valores || {};
    const html = '<div class="grade-campos">' + cfg.campos.map((c) => {
      const valor = v[c.nome] == null ? (c.padrao == null ? "" : c.padrao) : v[c.nome];
      const largo = c.largo ? ' style="grid-column:1/-1"' : "";
      const obrig = c.obrigatorio ? " required" : "";
      if (c.tipo === "checkbox") {
        return '<label class="campo-check"' + largo + '><input type="checkbox" name="' + c.nome + '"' + (valor === true ? " checked" : "") + "> " + esc(c.rotulo) + "</label>";
      }
      let entrada;
      if (c.tipo === "select") {
        entrada = '<select name="' + c.nome + '">' + c.opcoes.map((o) =>
          '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select>";
      } else if (c.tipo === "textarea") {
        entrada = '<textarea name="' + c.nome + '"' + obrig + ">" + esc(valor) + "</textarea>";
      } else {
        const lista = c.sugestoes ? ' list="lista-' + c.nome + '"' : "";
        entrada = '<input type="' + (c.tipo || "text") + '" name="' + c.nome + '" value="' + esc(valor) + '"' + obrig + lista +
          (c.tipo === "number" ? ' min="0" step="' + (c.passo || "1") + '"' : "") + ">" +
          (c.sugestoes ? '<datalist id="lista-' + c.nome + '">' + c.sugestoes.map((s) => '<option value="' + esc(s) + '">').join("") + "</datalist>" : "");
      }
      return '<label class="campo"' + largo + ">" + esc(c.rotulo) + (c.obrigatorio ? " *" : "") + entrada + (c.dica ? "<small>" + esc(c.dica) + "</small>" : "") + "</label>";
    }).join("") + "</div>";

    function coletar() {
      const corpo = $("janelaCorpo");
      const saida = {};
      for (const c of cfg.campos) {
        const el = corpo.querySelector('[name="' + c.nome + '"]');
        if (!el) continue;
        if (c.tipo === "checkbox") saida[c.nome] = el.checked;
        else if (c.tipo === "number") saida[c.nome] = el.value === "" ? 0 : Number(el.value);
        else saida[c.nome] = el.value.trim() === "" ? null : el.value.trim();
        if (c.obrigatorio && (saida[c.nome] === null || saida[c.nome] === "")) {
          el.focus();
          avisoRapido('Preencha o campo "' + c.rotulo + '".');
          return null;
        }
      }
      return saida;
    }

    const botoes = [];
    if (cfg.aoApagar) {
      botoes.push({ texto: ICONE.lixo + "Apagar", classe: "botao--perigo", esquerda: true, acao: async (el) => {
        if (el.dataset.certeza !== "1") { el.dataset.certeza = "1"; el.innerHTML = ICONE.lixo + "Clique de novo para apagar"; return; }
        el.disabled = true;
        if (await cfg.aoApagar()) fecharJanela(); else el.disabled = false;
      } });
    }
    (cfg.extras || []).forEach((b) => botoes.push(b));
    botoes.push({ texto: "Cancelar", classe: "botao--leve", acao: fecharJanela });
    botoes.push({ texto: "Salvar", acao: async (el) => {
      const dadosForm = coletar();
      if (!dadosForm) return;
      el.disabled = true;
      if (await cfg.aoSalvar(dadosForm)) fecharJanela(); else el.disabled = false;
    } });
    abrirJanela({ titulo: cfg.titulo, corpo: html, botoes, larga: cfg.larga });
  }

  /* ---------- Menu e abas ---------- */
  const ABAS = {
    portfolio: { titulo: "Portfólio", desenhar: abaPortfolio },
    marcas: { titulo: "Marcas", desenhar: abaMarcas },
    calendario: { titulo: "Calendário", desenhar: abaCalendario },
    campanhas: { titulo: "Campanhas", desenhar: abaCampanhas },
    checklist: { titulo: "Checklist portfólio", desenhar: abaChecklist }
  };
  const area = $("area");
  let vezDaAba = 0;
  async function abrirAba() {
    const nome = ABAS[location.hash.slice(1)] ? location.hash.slice(1) : "portfolio";
    const aba = ABAS[nome];
    document.querySelectorAll(".menu-item").forEach((a) => {
      if (a.dataset.aba === nome) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $("tituloAba").textContent = aba.titulo;
    document.title = aba.titulo + " | Painel";
    fecharMenu();
    const minhaVez = ++vezDaAba;
    area.innerHTML = '<p class="texto-suave">Carregando...</p>';
    try {
      await aba.desenhar(area, () => minhaVez === vezDaAba);
    } catch (e) {
      console.error(e);
      if (minhaVez === vezDaAba) {
        area.innerHTML = '<div class="aviso erro">Algo deu errado nesta aba. As outras continuam funcionando. Detalhe: ' + esc(e && e.message) + "</div>";
      }
    }
  }
  window.addEventListener("hashchange", abrirAba);

  const menu = $("menu");
  function fecharMenu() {
    menu.classList.remove("aberto");
    $("menuFundo").hidden = true;
    $("abrirMenu").setAttribute("aria-expanded", "false");
  }
  $("abrirMenu").addEventListener("click", () => {
    menu.classList.add("aberto");
    $("menuFundo").hidden = false;
    $("abrirMenu").setAttribute("aria-expanded", "true");
    menu.querySelector(".menu-item").focus();
  });
  $("fecharMenu").addEventListener("click", fecharMenu);
  $("menuFundo").addEventListener("click", fecharMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("aberto")) fecharMenu(); });
  $("sair").addEventListener("click", async () => {
    try { await banco.auth.signOut(); } catch (erro) { /* sai mesmo assim */ }
    location.replace("../login/");
  });

  /* =====================================================================
     1. PORTFÓLIO
     ===================================================================== */
  const idYoutube = (link) => {
    const t = String(link || "").trim();
    const m = t.match(/(?:shorts\/|[?&]v=|youtu\.be\/|embed\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(t) ? t : "";
  };

  async function abaPortfolio(area, aindaAqui) {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0); inicio.setDate(inicio.getDate() - 13);
    const [videos, visitas] = await Promise.all([
      ler("videos", (q) => q.select("*").order("ordem", { ascending: true }).order("id", { ascending: true })),
      ler("visitas", (q) => q.select("data, origem").gte("data", inicio.toISOString()).limit(20000))
    ]);
    if (!aindaAqui()) return;

    /* Visitas por dia nos últimos 14 dias */
    const dias = [];
    for (let i = 0; i < 14; i++) { const d = new Date(inicio); d.setDate(inicio.getDate() + i); dias.push(iso(d)); }
    const porDia = {};
    const porOrigem = {};
    visitas.forEach((v) => {
      const k = v.data ? iso(new Date(v.data)) : "";
      porDia[k] = (porDia[k] || 0) + 1;
      const o = (v.origem || "").trim() || "Direto";
      porOrigem[o] = (porOrigem[o] || 0) + 1;
    });
    const total14 = visitas.length;
    const hoje = porDia[hojeISO()] || 0;
    const noAr = videos.filter((v) => v.visivel !== false).length;
    const porNicho = {};
    videos.filter((v) => v.visivel !== false && v.nicho).forEach((v) => { porNicho[v.nicho] = (porNicho[v.nicho] || 0) + 1; });
    const nichoForte = Object.keys(porNicho).sort((a, b) => porNicho[b] - porNicho[a])[0];
    const origens = Object.keys(porOrigem).sort((a, b) => porOrigem[b] - porOrigem[a]);
    const maiorDia = Math.max(0, ...dias.map((d) => porDia[d] || 0));

    area.innerHTML =
      '<div class="faixa-numeros" style="--colunas:5">' +
        "<div><span>Visitas em 14 dias</span><strong>" + numero(total14) + "</strong></div>" +
        "<div><span>Visitas hoje</span><strong>" + numero(hoje) + "</strong></div>" +
        "<div><span>Vídeos no ar</span><strong>" + numero(noAr) + "</strong></div>" +
        "<div><span>Nicho mais forte</span><strong>" + esc(nichoForte || "Nenhum ainda") + "</strong>" + (nichoForte ? "<small>" + plural(porNicho[nichoForte], "vídeo", "vídeos") + "</small>" : "") + "</div>" +
        "<div><span>De onde mais vêm</span><strong>" + esc(origens[0] || "Sem visitas") + "</strong></div>" +
      "</div>" +
      '<div class="duas-colunas">' +
        '<div class="cartao"><h2>Visitas nos últimos 14 dias</h2>' +
          (total14 === 0
            ? '<p class="vazio">Ainda não há visitas registradas. Quando as pessoas começarem a abrir o seu portfólio, aqui vai aparecer uma barra para cada dia, mostrando quantas visitas chegaram.</p>'
            : '<div class="grafico" role="img" aria-label="Visitas por dia nos últimos 14 dias">' + dias.map((d) => {
                const n = porDia[d] || 0;
                const altura = maiorDia > 0 ? Math.max(2, Math.round((n / maiorDia) * 100)) : 2;
                return '<div class="barra' + (d === hojeISO() ? " hoje" : "") + '" title="' + fmtData(d) + ": " + plural(n, "visita", "visitas") + '"><b>' + (n || "") + '</b><i style="height:' + altura + '%"></i><span>' + fmtDia(d) + "</span></div>";
              }).join("") + "</div>") +
        "</div>" +
        '<div class="cartao"><h2>Por onde as pessoas chegaram</h2>' +
          (total14 === 0
            ? '<p class="vazio">Aqui vai aparecer de onde vêm as visitas: Instagram, Google, WhatsApp ou link direto.</p>'
            : '<ul class="lista-origens">' + origens.slice(0, 8).map((o) => {
                const pct = Math.round((porOrigem[o] / total14) * 100);
                return "<li><span>" + esc(o) + "</span><b>" + numero(porOrigem[o]) + " (" + pct + "%)</b><span class=\"trilho\"><i style=\"width:" + pct + '%"></i></span></li>';
              }).join("") + "</ul>") +
        "</div>" +
      "</div>" +
      '<div class="cartao">' +
        '<div class="cartao-topo"><h2>Meus vídeos</h2><span class="texto-suave">Arraste pela alcinha para mudar a ordem no site.</span>' +
        '<button class="botao" type="button" id="novoVideo">' + ICONE.mais + "Adicionar vídeo</button></div>" +
        '<div class="tabela-rolagem"><table><thead><tr>' +
          '<th style="width:34px"><span class="so-leitor">Ordem</span></th><th>Vídeo</th><th>Nicho</th><th>Formato</th><th>Marca</th><th>Destaque</th><th style="width:110px"><span class="so-leitor">Ações</span></th>' +
        '</tr></thead><tbody id="corpoVideos"></tbody></table></div>' +
      "</div>";

    let lista = videos.slice();
    const corpo = $("corpoVideos");
    const nichosExistentes = () => Array.from(new Set(lista.map((v) => v.nicho).filter(Boolean)));
    const formatosExistentes = () => Array.from(new Set(lista.map((v) => v.formato).filter(Boolean)));

    function desenharTabela() {
      if (!lista.length) {
        corpo.innerHTML = '<tr><td colspan="7"><p class="vazio">Nenhum vídeo ainda. Clique em "Adicionar vídeo" para colocar o primeiro.</p></td></tr>';
        return;
      }
      corpo.innerHTML = lista.map((v, i) => {
        const yt = idYoutube(v.link);
        const visivel = v.visivel !== false;
        return '<tr data-i="' + i + '" class="' + (visivel ? "" : "escondido") + '">' +
          '<td><button class="alca" type="button" aria-label="Mover ' + esc(v.titulo || "vídeo") + ' (use as setas do teclado)">' + ICONE.alca + "</button></td>" +
          '<td><div style="display:flex;align-items:center;gap:10px">' +
            (yt ? '<img class="miniatura" src="https://i.ytimg.com/vi/' + esc(yt) + '/hqdefault.jpg" alt="" loading="lazy">' : '<span class="miniatura"></span>') +
            "<div><b>" + esc(v.titulo || "Sem título") + "</b>" + (v.exemplo ? '<span class="pilula p-exemplo">exemplo</span>' : "") +
            '<br><a class="texto-suave" href="' + esc(v.link) + '" target="_blank" rel="noopener">abrir link</a></div></div></td>' +
          "<td>" + esc(v.nicho || "") + "</td><td>" + esc(v.formato || "") + "</td><td>" + esc(v.marca || "") + "</td><td>" + esc(v.destaque || "") + "</td>" +
          '<td><span class="acoes">' +
            '<button class="icone-botao" type="button" data-acao="olho" aria-pressed="' + visivel + '" aria-label="' + (visivel ? "Esconder do site" : "Mostrar no site") + '" title="' + (visivel ? "No site. Clique para esconder" : "Escondido. Clique para mostrar") + '">' + (visivel ? ICONE.olho : ICONE.olhoFechado) + "</button>" +
            '<button class="icone-botao" type="button" data-acao="editar" aria-label="Editar">' + ICONE.lapis + "</button>" +
            '<button class="icone-botao" type="button" data-acao="apagar" aria-label="Apagar">' + ICONE.lixo + "</button>" +
          "</span></td></tr>";
      }).join("");
    }
    desenharTabela();

    function formVideo(v) {
      formulario({
        titulo: v ? "Editar vídeo" : "Adicionar vídeo",
        valores: v || { visivel: true },
        campos: [
          { nome: "titulo", rotulo: "Título", largo: true, obrigatorio: true },
          { nome: "link", rotulo: "Link do YouTube", largo: true, obrigatorio: true, tipo: "url", dica: "Pode colar o link do Shorts como ele vem do YouTube." },
          { nome: "nicho", rotulo: "Nicho", sugestoes: nichosExistentes(), dica: "Vídeos com o mesmo nicho ficam juntos no site." },
          { nome: "formato", rotulo: "Formato", sugestoes: formatosExistentes() },
          { nome: "marca", rotulo: "Marca", dica: "Aparece na etiqueta em cima do vídeo." },
          { nome: "destaque", rotulo: "Destaque", dica: "Ex: 2,4M views" },
          { nome: "visivel", rotulo: "Mostrar no site", tipo: "checkbox" }
        ],
        aoSalvar: async (d) => {
          if (!idYoutube(d.link)) { avisoRapido("Esse link não parece ser do YouTube. Confira e tente de novo."); return false; }
          if (v) {
            const ok = await gravar("videos", (q) => q.update(d).eq("id", v.id), "Vídeo salvo. O site já mostra a mudança.");
            if (ok) { Object.assign(v, d); desenharTabela(); }
            return ok;
          }
          d.ordem = lista.reduce((m, x) => Math.max(m, Number(x.ordem) || 0), 0) + 1;
          const ok = await gravar("videos", (q) => q.insert(d), "Vídeo adicionado. Ele já aparece no site.");
          if (ok) abrirAba();
          return ok;
        },
        aoApagar: v ? async () => {
          const ok = await gravar("videos", (q) => q.delete().eq("id", v.id), "Vídeo apagado.");
          if (ok) { lista = lista.filter((x) => x !== v); desenharTabela(); }
          return ok;
        } : null
      });
    }
    $("novoVideo").addEventListener("click", () => formVideo(null));

    corpo.addEventListener("click", async (e) => {
      const botao = e.target.closest("[data-acao]");
      if (!botao) return;
      const v = lista[Number(botao.closest("tr").dataset.i)];
      if (botao.dataset.acao === "editar") formVideo(v);
      if (botao.dataset.acao === "apagar") {
        if (!confirm('Apagar o vídeo "' + (v.titulo || "sem título") + '"? Ele sai do site e não volta.')) return;
        if (await gravar("videos", (q) => q.delete().eq("id", v.id), "Vídeo apagado.")) { lista = lista.filter((x) => x !== v); desenharTabela(); }
      }
      if (botao.dataset.acao === "olho") {
        const novo = v.visivel === false;
        if (await gravar("videos", (q) => q.update({ visivel: novo }).eq("id", v.id), novo ? "Vídeo de volta no site." : "Vídeo escondido do site.")) {
          v.visivel = novo; desenharTabela();
        }
      }
    });

    /* Mudar a ordem: arrastar pela alcinha, ou setas do teclado em cima dela */
    async function salvarOrdem() {
      const mudancas = [];
      lista.forEach((v, i) => { if (Number(v.ordem) !== i + 1) { v.ordem = i + 1; mudancas.push(v); } });
      desenharTabela();
      if (!mudancas.length) return;
      const resultados = await Promise.all(mudancas.map((v) => gravar("videos", (q) => q.update({ ordem: v.ordem }).eq("id", v.id))));
      if (resultados.every(Boolean)) avisoRapido("Ordem salva. O site já segue a ordem nova.");
    }
    let arrastado = null;
    corpo.addEventListener("pointerdown", (e) => {
      const alca = e.target.closest(".alca");
      if (alca) alca.closest("tr").draggable = true;
    });
    corpo.addEventListener("dragstart", (e) => {
      const tr = e.target.closest("tr");
      arrastado = Number(tr.dataset.i);
      tr.classList.add("arrastando");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", String(arrastado)); } catch (erro) { /* alguns navegadores */ }
    });
    corpo.addEventListener("dragover", (e) => {
      if (arrastado === null) return;
      e.preventDefault();
      const tr = e.target.closest("tr");
      corpo.querySelectorAll(".alvo-acima, .alvo-abaixo").forEach((x) => x.classList.remove("alvo-acima", "alvo-abaixo"));
      if (!tr) return;
      const r = tr.getBoundingClientRect();
      tr.classList.add(e.clientY < r.top + r.height / 2 ? "alvo-acima" : "alvo-abaixo");
    });
    corpo.addEventListener("drop", (e) => {
      e.preventDefault();
      const tr = e.target.closest("tr");
      if (arrastado === null || !tr) return;
      const r = tr.getBoundingClientRect();
      let alvo = Number(tr.dataset.i) + (e.clientY < r.top + r.height / 2 ? 0 : 1);
      const [item] = lista.splice(arrastado, 1);
      if (alvo > arrastado) alvo -= 1;
      lista.splice(alvo, 0, item);
      arrastado = null;
      salvarOrdem();
    });
    corpo.addEventListener("dragend", () => {
      arrastado = null;
      corpo.querySelectorAll("tr").forEach((tr) => { tr.draggable = false; tr.classList.remove("arrastando", "alvo-acima", "alvo-abaixo"); });
    });
    corpo.addEventListener("keydown", (e) => {
      const alca = e.target.closest(".alca");
      if (!alca || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      const i = Number(alca.closest("tr").dataset.i);
      const j = e.key === "ArrowUp" ? i - 1 : i + 1;
      if (j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      salvarOrdem().then(() => { const nova = corpo.querySelector('tr[data-i="' + j + '"] .alca'); if (nova) nova.focus(); });
    });
  }

  /* =====================================================================
     2. MARCAS
     ===================================================================== */
  const SITUACOES = [["lead", "Lead"], ["conversando", "Conversando"], ["cliente", "Cliente"], ["parada", "Parada"]];
  const nomeSituacao = (s) => (SITUACOES.find((x) => x[0] === s) || [s, s || ""])[1];
  const estadoMarcas = { busca: "", filtro: "todas" };
  const linkWhats = (tel) => {
    let n = String(tel || "").replace(/\D/g, "");
    if (n.length === 10 || n.length === 11) n = "55" + n;
    return n.length >= 12 ? "https://wa.me/" + n : "";
  };
  const linkInsta = (ig) => {
    const u = String(ig || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");
    return u ? "https://instagram.com/" + encodeURIComponent(u) : "";
  };

  async function abaMarcas(area, aindaAqui) {
    let lista = await ler("marcas", (q) => q.select("*").order("criado_em", { ascending: false }));
    if (!aindaAqui()) return;

    area.innerHTML =
      '<div class="cartao">' +
        '<div class="cartao-topo">' +
          '<input class="campo-busca" type="search" id="buscaMarcas" placeholder="Buscar por nome, @ ou e-mail" aria-label="Buscar marcas" value="' + esc(estadoMarcas.busca) + '">' +
          '<div class="filtros" id="filtroMarcas" role="group" aria-label="Filtrar por situação">' +
            [["todas", "Todas"]].concat(SITUACOES).map((s) => '<button class="filtro" type="button" data-f="' + s[0] + '" aria-pressed="' + (estadoMarcas.filtro === s[0]) + '">' + s[1] + "</button>").join("") +
          "</div>" +
          '<span style="flex:1"></span>' +
          '<button class="botao botao--leve" type="button" id="baixarMarcas">' + ICONE.baixar + "Baixar CSV</button>" +
          '<button class="botao" type="button" id="novaMarca">' + ICONE.mais + "Adicionar marca</button>" +
        "</div>" +
        '<div class="tabela-rolagem"><table><thead><tr><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead><tbody id="corpoMarcas"></tbody></table></div>' +
        '<p class="texto-suave" id="contaMarcas" style="margin-top:8px"></p>' +
      "</div>";

    const filtradas = () => {
      const b = estadoMarcas.busca.toLowerCase();
      return lista.filter((m) =>
        (estadoMarcas.filtro === "todas" || m.situacao === estadoMarcas.filtro) &&
        (!b || [m.nome, m.instagram, m.email].some((x) => String(x || "").toLowerCase().includes(b))));
    };
    function desenhar() {
      const f = filtradas();
      $("contaMarcas").textContent = plural(f.length, "marca", "marcas") + (f.length !== lista.length ? " de " + lista.length : "");
      $("corpoMarcas").innerHTML = f.length ? f.map((m) => {
        const w = linkWhats(m.telefone);
        const ig = linkInsta(m.instagram);
        return '<tr class="clicavel" data-id="' + esc(m.id) + '">' +
          "<td><b>" + esc(m.nome) + "</b>" + (m.exemplo ? '<span class="pilula p-exemplo">exemplo</span>' : "") + "</td>" +
          "<td>" + (ig ? '<a href="' + esc(ig) + '" target="_blank" rel="noopener">' + esc(m.instagram) + "</a>" : esc(m.instagram || "")) + "</td>" +
          "<td>" + (m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a>" : "") + "</td>" +
          '<td style="white-space:nowrap">' + esc(m.telefone || "") + (w ? ' <a class="icone-botao" href="' + esc(w) + '" target="_blank" rel="noopener" aria-label="Abrir WhatsApp de ' + esc(m.nome) + '" title="Abrir WhatsApp">' + ICONE.whats + "</a>" : "") + "</td>" +
          '<td><span class="pilula p-' + esc(m.situacao) + '">' + esc(nomeSituacao(m.situacao)) + "</span></td>" +
          '<td style="max-width:260px"><span title="' + esc(m.obs || "") + '" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.obs || "") + "</span></td>" +
          '<td style="white-space:nowrap">' + fmtData(m.ultimo_contato) + "</td></tr>";
      }).join("") : '<tr><td colspan="7"><p class="vazio">' + (lista.length ? "Nenhuma marca encontrada com essa busca." : "Sua base ainda está vazia. As marcas que mandarem o formulário do site aparecem aqui como Lead.") + "</p></td></tr>";
    }
    desenhar();

    $("buscaMarcas").addEventListener("input", (e) => { estadoMarcas.busca = e.target.value; desenhar(); });
    $("filtroMarcas").addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]");
      if (!b) return;
      estadoMarcas.filtro = b.dataset.f;
      $("filtroMarcas").querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenhar();
    });
    $("baixarMarcas").addEventListener("click", () => {
      baixarCSV("base-de-marcas", ["Marca", "Instagram", "E-mail", "Telefone", "Situação", "Observação", "Último contato"],
        filtradas().map((m) => [m.nome, m.instagram, m.email, m.telefone, nomeSituacao(m.situacao), m.obs, fmtData(m.ultimo_contato)]));
    });

    function formMarca(m) {
      const w = m && linkWhats(m.telefone);
      formulario({
        titulo: m ? "Editar marca" : "Adicionar marca",
        valores: m || { situacao: "lead", ultimo_contato: hojeISO() },
        campos: [
          { nome: "nome", rotulo: "Marca", obrigatorio: true },
          { nome: "situacao", rotulo: "Situação", tipo: "select", opcoes: SITUACOES },
          { nome: "instagram", rotulo: "Instagram", dica: "Ex: @nomedamarca" },
          { nome: "email", rotulo: "E-mail", tipo: "email" },
          { nome: "telefone", rotulo: "Telefone", tipo: "tel", dica: "Com DDD. Abre o WhatsApp direto." },
          { nome: "ultimo_contato", rotulo: "Último contato", tipo: "date" },
          { nome: "obs", rotulo: "Observação", tipo: "textarea", largo: true }
        ],
        extras: w ? [{ texto: ICONE.whats + "WhatsApp", classe: "botao--leve esquerda", link: w }] : [],
        aoSalvar: async (d) => {
          const ok = m
            ? await gravar("marcas", (q) => q.update(d).eq("id", m.id), "Marca salva.")
            : await gravar("marcas", (q) => q.insert(d), "Marca adicionada.");
          if (ok) abrirAba();
          return ok;
        },
        aoApagar: m ? async () => {
          const ok = await gravar("marcas", (q) => q.delete().eq("id", m.id), "Marca apagada.");
          if (ok) abrirAba();
          return ok;
        } : null
      });
    }
    $("novaMarca").addEventListener("click", () => formMarca(null));
    $("corpoMarcas").addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      formMarca(lista.find((m) => String(m.id) === tr.dataset.id));
    });
  }

  /* =====================================================================
     3. CALENDÁRIO
     ===================================================================== */
  const TIPOS_CAL = [["gravar", "Gravar"], ["editar", "Editar"], ["postar", "Postar"]];
  const estadoCal = { mes: new Date(new Date().getFullYear(), new Date().getMonth(), 1), filtro: "todos" };

  async function abaCalendario(area, aindaAqui) {
    const [itens, campanhas] = await Promise.all([
      ler("calendario", (q) => q.select("*").order("data", { ascending: true })),
      ler("campanhas", (q) => q.select("id, campanha, cliente, prazo, status").not("prazo", "is", null))
    ]);
    if (!aindaAqui()) return;

    const prazos = campanhas.map((c) => ({
      prazo: true, id: "c" + c.id, data: c.prazo, titulo: "Prazo: " + (c.campanha || ""), marca: c.cliente, tipo: "prazo",
      status: c.status === "Entregue" ? "feito" : "a fazer", campanha: c
    }));

    area.innerHTML =
      '<div class="cartao">' +
        '<div class="cal-topo">' +
          '<button class="icone-botao" type="button" id="mesAntes" aria-label="Mês anterior">' + ICONE.esquerda + "</button>" +
          '<h2 id="nomeMes" aria-live="polite"></h2>' +
          '<button class="icone-botao" type="button" id="mesDepois" aria-label="Próximo mês">' + ICONE.direita + "</button>" +
          '<button class="botao botao--leve" type="button" id="esteMes">Este mês</button>' +
          '<span style="flex:1"></span>' +
          '<div class="filtros" id="filtroCal" role="group" aria-label="Filtrar por tipo">' +
            [["todos", "Todos"]].concat(TIPOS_CAL, [["prazo", "Prazos"]]).map((t) => '<button class="filtro" type="button" data-f="' + t[0] + '" aria-pressed="' + (estadoCal.filtro === t[0]) + '">' + t[1] + "</button>").join("") +
          "</div>" +
          '<button class="botao" type="button" id="novoItem">' + ICONE.mais + "Adicionar</button>" +
        "</div>" +
        '<div class="cal-grade" id="grade"></div>' +
        '<div class="legenda"><span style="--c:var(--terracota-claro)">Gravar</span><span style="--c:var(--amarelo)">Editar</span><span style="--c:var(--verde-claro)">Postar</span><span style="--c:var(--tinta)">Prazo de campanha</span></div>' +
      "</div>" +
      '<div class="cartao"><h2>Ficou pra trás</h2><ul class="lista-simples" id="atrasados"></ul></div>';

    const doDia = (dia) => itens.concat(prazos).filter((x) => x.data && String(x.data).slice(0, 10) === dia &&
      (estadoCal.filtro === "todos" || x.tipo === estadoCal.filtro));
    const rotuloItem = (x) => (x.prazo ? "" : (TIPOS_CAL.find((t) => t[0] === x.tipo) || ["", ""])[1] + ": ") + (x.titulo || "") + (x.marca && !x.prazo ? " (" + x.marca + ")" : "");
    const botaoItem = (x) => '<button class="cal-item t-' + esc(x.tipo) + (x.status === "feito" ? " feito" : "") + '" type="button" data-item="' + esc(x.id) + '" title="' + esc(rotuloItem(x)) + '">' + esc(rotuloItem(x)) + "</button>";

    function desenharGrade() {
      const ano = estadoCal.mes.getFullYear(), mes = estadoCal.mes.getMonth();
      const nomeMes = estadoCal.mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      $("nomeMes").textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
      const primeiro = new Date(ano, mes, 1);
      const recuo = (primeiro.getDay() + 6) % 7;
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();
      const semanas = Math.ceil((recuo + diasNoMes) / 7);
      const hoje = hojeISO();
      let html = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => '<div class="cal-semana">' + d + "</div>").join("");
      for (let i = 0; i < semanas * 7; i++) {
        const d = new Date(ano, mes, 1 - recuo + i);
        const k = iso(d);
        const doDiaLista = doDia(k);
        const fora = d.getMonth() !== mes;
        html += '<div class="cal-dia' + (fora ? " fora" : "") + (k === hoje ? " hoje" : "") + '" data-dia="' + k + '">' +
          '<span class="cal-num">' + d.getDate() + "</span>" +
          '<button class="cal-mais-dia" type="button" data-novo="' + k + '" aria-label="Adicionar em ' + fmtData(k) + '">+</button>' +
          doDiaLista.slice(0, 3).map(botaoItem).join("") +
          (doDiaLista.length > 3 ? '<button class="cal-ver-mais" type="button" data-ver="' + k + '">+' + (doDiaLista.length - 3) + " mais</button>" : "") +
          "</div>";
      }
      $("grade").innerHTML = html;
    }

    function desenharAtrasados() {
      const hoje = hojeISO();
      const atrasados = itens.filter((x) => x.data && String(x.data).slice(0, 10) < hoje && x.status !== "feito");
      $("atrasados").innerHTML = atrasados.length ? atrasados.map((x) => {
        const dias = -diasAte(x.data);
        return '<li><span class="pilula etiqueta-atraso">há ' + plural(dias, "dia", "dias") + "</span>" +
          '<span class="cresce">' + esc(rotuloItem(x)) + ' <span class="texto-suave">' + fmtData(x.data) + "</span></span>" +
          '<button class="botao botao--leve" type="button" data-feito="' + esc(x.id) + '">Marcar como feito</button>' +
          '<button class="botao botao--leve" type="button" data-item="' + esc(x.id) + '">Abrir</button></li>';
      }).join("") : '<li class="texto-suave">Nada atrasado. Tudo em dia.</li>';
    }
    desenharGrade();
    desenharAtrasados();

    function formItem(x, dia) {
      formulario({
        titulo: x ? "Editar no calendário" : "Adicionar no calendário",
        valores: x || { data: dia || hojeISO(), tipo: "gravar", status: "a fazer" },
        campos: [
          { nome: "titulo", rotulo: "O que é", obrigatorio: true, largo: true },
          { nome: "marca", rotulo: "Marca" },
          { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true },
          { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS_CAL },
          { nome: "status", rotulo: "Status", tipo: "select", opcoes: [["a fazer", "A fazer"], ["feito", "Feito"]] }
        ],
        aoSalvar: async (d) => {
          const ok = x
            ? await gravar("calendario", (q) => q.update(d).eq("id", x.id), "Salvo no calendário.")
            : await gravar("calendario", (q) => q.insert(d), "Adicionado ao calendário.");
          if (ok) abrirAba();
          return ok;
        },
        aoApagar: x ? async () => {
          const ok = await gravar("calendario", (q) => q.delete().eq("id", x.id), "Apagado do calendário.");
          if (ok) abrirAba();
          return ok;
        } : null
      });
    }
    function abrirItem(id) {
      const x = itens.concat(prazos).find((i) => String(i.id) === String(id));
      if (!x) return;
      if (x.prazo) {
        abrirJanela({
          titulo: "Prazo de campanha",
          corpo: "<p><b>" + esc(x.campanha.campanha) + "</b>" + (x.campanha.cliente ? " para " + esc(x.campanha.cliente) : "") + "</p>" +
            '<p class="texto-suave">Prazo em ' + fmtData(x.data) + ". Status: " + esc(x.campanha.status) + ".</p>" +
            '<p class="texto-suave">Esse prazo vem da aba Campanhas. Para mudar, edite a campanha lá.</p>',
          botoes: [{ texto: "Abrir Campanhas", acao: () => { fecharJanela(); location.hash = "#campanhas"; } }]
        });
      } else {
        formItem(x);
      }
    }
    function abrirDia(dia) {
      const lista = doDia(dia);
      abrirJanela({
        titulo: paraData(dia).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
        corpo: '<div style="display:grid;gap:4px">' + lista.map(botaoItem).join("") + "</div>",
        botoes: [{ texto: ICONE.mais + "Adicionar neste dia", acao: () => formItem(null, dia) }],
        aoAbrir: (corpo) => corpo.addEventListener("click", (e) => {
          const b = e.target.closest("[data-item]");
          if (b) abrirItem(b.dataset.item);
        })
      });
    }

    $("grade").addEventListener("click", (e) => {
      const item = e.target.closest("[data-item]");
      if (item) { abrirItem(item.dataset.item); return; }
      const ver = e.target.closest("[data-ver]");
      if (ver) { abrirDia(ver.dataset.ver); return; }
      const novo = e.target.closest("[data-novo]");
      if (novo) { formItem(null, novo.dataset.novo); return; }
      const dia = e.target.closest("[data-dia]");
      if (dia) formItem(null, dia.dataset.dia);
    });
    $("atrasados").addEventListener("click", async (e) => {
      const feito = e.target.closest("[data-feito]");
      if (feito) {
        const x = itens.find((i) => String(i.id) === feito.dataset.feito);
        if (x && await gravar("calendario", (q) => q.update({ status: "feito" }).eq("id", x.id), "Marcado como feito.")) {
          x.status = "feito"; desenharGrade(); desenharAtrasados();
        }
        return;
      }
      const abrir = e.target.closest("[data-item]");
      if (abrir) abrirItem(abrir.dataset.item);
    });
    const mudarMes = (n) => { estadoCal.mes = new Date(estadoCal.mes.getFullYear(), estadoCal.mes.getMonth() + n, 1); desenharGrade(); };
    $("mesAntes").addEventListener("click", () => mudarMes(-1));
    $("mesDepois").addEventListener("click", () => mudarMes(1));
    $("esteMes").addEventListener("click", () => { estadoCal.mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1); desenharGrade(); });
    $("novoItem").addEventListener("click", () => formItem(null, hojeISO()));
    $("filtroCal").addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]");
      if (!b) return;
      estadoCal.filtro = b.dataset.f;
      $("filtroCal").querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenharGrade();
    });
  }

  /* =====================================================================
     4. CAMPANHAS
     ===================================================================== */
  const FUNIL = ["Briefing", "Roteiro", "Aprovação Roteiro", "Gravação", "Edição", "Aprovado", "Entregue"];
  const estadoCamp = { filtro: "todas", busca: "", coluna: "prazo", sentido: 1 };
  const COLUNAS = [
    { chave: "favorita", rotulo: "Estrela", valor: (c) => (c.favorita ? 0 : 1) },
    { chave: "campanha", rotulo: "Campanha", valor: (c) => c.campanha || "" },
    { chave: "cliente", rotulo: "Cliente", valor: (c) => c.cliente || "" },
    { chave: "tipo", rotulo: "Tipo", valor: (c) => c.tipo || "" },
    { chave: "status", rotulo: "Status", valor: (c) => { const i = FUNIL.indexOf(c.status); return i < 0 ? 99 : i; } },
    { chave: "qtd", rotulo: "Qtd", valor: (c) => Number(c.qtd) || 0, num: true },
    { chave: "valor", rotulo: "Valor", valor: (c) => Number(c.valor) || 0, num: true },
    { chave: "prazo", rotulo: "Prazo", valor: (c) => c.prazo || null },
    { chave: "pagamento", rotulo: "Pagamento", valor: (c) => c.pagamento || "" }
  ];

  async function abaCampanhas(area, aindaAqui) {
    const lista = await ler("campanhas", (q) => q.select("*").order("criado_em", { ascending: false }));
    if (!aindaAqui()) return;

    const total = lista.length;
    const ativas = lista.filter((c) => c.ativa !== false).length;
    const valorTotal = lista.reduce((s, c) => s + (Number(c.valor) || 0), 0);
    const qtdTotal = lista.reduce((s, c) => s + (Number(c.qtd) || 0), 0);
    const ticket = qtdTotal > 0 ? valorTotal / qtdTotal : 0;
    const aReceber = lista.filter((c) => c.pagamento !== "pago").reduce((s, c) => s + (Number(c.valor) || 0), 0);
    const recebido = lista.filter((c) => c.pagamento === "pago").reduce((s, c) => s + (Number(c.valor) || 0), 0);

    area.innerHTML =
      '<div class="faixa-numeros" style="--colunas:4">' +
        "<div><span>Total de campanhas</span><strong>" + numero(total) + "</strong></div>" +
        "<div><span>Ativas</span><strong>" + numero(ativas) + "</strong></div>" +
        "<div><span>Valor total</span><strong>" + dinheiro(valorTotal) + "</strong><small>" + (qtdTotal > 0 ? "Ticket médio por vídeo: " + dinheiro(ticket) : "Ticket médio aparece quando houver vídeos") + "</small></div>" +
        "<div><span>A receber</span><strong>" + dinheiro(aReceber) + "</strong><small>Já recebido: " + dinheiro(recebido) + "</small></div>" +
      "</div>" +
      '<div class="cartao">' +
        '<div class="cartao-topo">' +
          '<div class="filtros" id="filtroCamp" role="group" aria-label="Filtrar campanhas">' +
            [["todas", "Todas"], ["ativas", "Ativas"], ["finalizadas", "Finalizadas"]].map((f) => '<button class="filtro" type="button" data-f="' + f[0] + '" aria-pressed="' + (estadoCamp.filtro === f[0]) + '">' + f[1] + "</button>").join("") +
          "</div>" +
          '<input class="campo-busca" type="search" id="buscaCamp" placeholder="Buscar campanha ou cliente" aria-label="Buscar campanhas" value="' + esc(estadoCamp.busca) + '">' +
          '<span style="flex:1"></span>' +
          '<button class="botao botao--leve" type="button" id="baixarCamp">' + ICONE.baixar + "Baixar CSV</button>" +
          '<button class="botao" type="button" id="novaCamp">' + ICONE.mais + "Adicionar campanha</button>" +
        "</div>" +
        '<div class="tabela-rolagem"><table><thead><tr id="cabecaCamp"></tr></thead><tbody id="corpoCamp"></tbody></table></div>' +
      "</div>";

    const visiveis = () => {
      const b = estadoCamp.busca.toLowerCase();
      const col = COLUNAS.find((c) => c.chave === estadoCamp.coluna) || COLUNAS[7];
      return lista.filter((c) =>
        (estadoCamp.filtro === "todas" || (estadoCamp.filtro === "ativas" ? c.ativa !== false : c.ativa === false)) &&
        (!b || [c.campanha, c.cliente].some((x) => String(x || "").toLowerCase().includes(b)))
      ).sort((a, z) => {
        const va = col.valor(a), vz = col.valor(z);
        if (va === null && vz === null) return 0;
        if (va === null) return 1;
        if (vz === null) return -1;
        const r = typeof va === "number" && typeof vz === "number" ? va - vz : String(va).localeCompare(String(vz), "pt-BR", { sensitivity: "base" });
        return r * estadoCamp.sentido;
      });
    };

    function etiquetaPrazo(c) {
      if (!c.prazo || c.status === "Entregue") return "";
      const d = diasAte(c.prazo);
      if (d < 0) return ' <span class="pilula etiqueta-atraso">atrasado ' + plural(-d, "dia", "dias") + "</span>";
      if (d === 0) return ' <span class="pilula etiqueta-perto">vence hoje</span>';
      if (d <= 3) return ' <span class="pilula etiqueta-perto">vence em ' + plural(d, "dia", "dias") + "</span>";
      return "";
    }
    function desenhar() {
      $("cabecaCamp").innerHTML = COLUNAS.map((c) => {
        const ativa = estadoCamp.coluna === c.chave;
        const sentido = estadoCamp.sentido === 1 ? "ascending" : "descending";
        return '<th class="' + (c.num ? "num" : "") + '"' + (ativa ? ' aria-sort="' + sentido + '"' : "") + '><button class="ordenar" type="button" data-col="' + c.chave + '"' + (ativa ? ' aria-sort="' + sentido + '"' : "") + ">" +
          (c.chave === "favorita" ? '<span class="so-leitor">Estrela</span>' + ICONE.estrela : c.rotulo) +
          '<span class="seta" aria-hidden="true">' + (ativa ? (estadoCamp.sentido === 1 ? "▲" : "▼") : "↕") + "</span></button></th>";
      }).join("");
      const v = visiveis();
      $("corpoCamp").innerHTML = v.length ? v.map((c) => {
        const iStatus = FUNIL.indexOf(c.status);
        return '<tr class="clicavel' + (c.favorita ? " linha-favorita" : "") + '" data-id="' + esc(c.id) + '">' +
          '<td><button class="estrela" type="button" data-estrela="' + esc(c.id) + '" aria-pressed="' + !!c.favorita + '" aria-label="' + (c.favorita ? "Tirar destaque" : "Destacar campanha") + '">' + ICONE.estrela + "</button></td>" +
          "<td><b>" + esc(c.campanha) + "</b>" + (c.exemplo ? '<span class="pilula p-exemplo">exemplo</span>' : "") + (c.ativa === false ? ' <span class="texto-suave">(finalizada)</span>' : "") + "</td>" +
          "<td>" + esc(c.cliente || "") + "</td>" +
          '<td><span class="pilula ' + (c.tipo === "Publicidade" ? "p-publicidade" : "p-conteudo") + '">' + esc(c.tipo || "") + "</span></td>" +
          '<td><span class="pilula p-s' + (iStatus < 0 ? 0 : iStatus) + '">' + esc(c.status || "") + "</span></td>" +
          '<td class="num">' + numero(c.qtd) + "</td>" +
          '<td class="num">' + dinheiro(c.valor) + "</td>" +
          '<td style="white-space:nowrap">' + fmtData(c.prazo) + etiquetaPrazo(c) + "</td>" +
          '<td><span class="pilula p-' + (c.pagamento === "pago" ? "pago" : "pendente") + '">' + (c.pagamento === "pago" ? "Pago" : "Pendente") + "</span></td></tr>";
      }).join("") : '<tr><td colspan="9"><p class="vazio">' + (lista.length ? "Nenhuma campanha com esse filtro." : "Nenhuma campanha ainda. Clique em \"Adicionar campanha\" para começar.") + "</p></td></tr>";
    }
    desenhar();

    $("cabecaCamp").addEventListener("click", (e) => {
      const b = e.target.closest("[data-col]");
      if (!b) return;
      if (estadoCamp.coluna === b.dataset.col) estadoCamp.sentido *= -1;
      else { estadoCamp.coluna = b.dataset.col; estadoCamp.sentido = 1; }
      desenhar();
      const foco = $("cabecaCamp").querySelector('[data-col="' + b.dataset.col + '"]');
      if (foco) foco.focus();
    });
    $("filtroCamp").addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]");
      if (!b) return;
      estadoCamp.filtro = b.dataset.f;
      $("filtroCamp").querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenhar();
    });
    $("buscaCamp").addEventListener("input", (e) => { estadoCamp.busca = e.target.value; desenhar(); });
    $("baixarCamp").addEventListener("click", () => {
      baixarCSV("campanhas", ["Favorita", "Campanha", "Cliente", "Tipo", "Status", "Qtd", "Valor", "Prazo", "Pagamento", "Ativa"],
        visiveis().map((c) => [c.favorita ? "Sim" : "Não", c.campanha, c.cliente, c.tipo, c.status, c.qtd,
          (Number(c.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }), fmtData(c.prazo), c.pagamento === "pago" ? "Pago" : "Pendente", c.ativa === false ? "Não" : "Sim"]));
    });

    function formCamp(c) {
      formulario({
        titulo: c ? "Editar campanha" : "Adicionar campanha",
        valores: c || { tipo: "Conteúdo", status: "Briefing", qtd: 1, valor: 0, pagamento: "pendente", ativa: true, favorita: false },
        campos: [
          { nome: "campanha", rotulo: "Campanha", obrigatorio: true, largo: true },
          { nome: "cliente", rotulo: "Cliente" },
          { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [["Conteúdo", "Conteúdo"], ["Publicidade", "Publicidade"]] },
          { nome: "status", rotulo: "Status", tipo: "select", opcoes: FUNIL.map((s) => [s, s]) },
          { nome: "prazo", rotulo: "Prazo", tipo: "date" },
          { nome: "qtd", rotulo: "Quantidade de vídeos", tipo: "number" },
          { nome: "valor", rotulo: "Valor (R$)", tipo: "number", passo: "0.01" },
          { nome: "pagamento", rotulo: "Pagamento", tipo: "select", opcoes: [["pendente", "Pendente"], ["pago", "Pago"]] },
          { nome: "ativa", rotulo: "Campanha ativa", tipo: "checkbox" },
          { nome: "favorita", rotulo: "Destacar com estrela", tipo: "checkbox" }
        ],
        aoSalvar: async (d) => {
          const ok = c
            ? await gravar("campanhas", (q) => q.update(d).eq("id", c.id), "Campanha salva.")
            : await gravar("campanhas", (q) => q.insert(d), "Campanha adicionada.");
          if (ok) abrirAba();
          return ok;
        },
        aoApagar: c ? async () => {
          const ok = await gravar("campanhas", (q) => q.delete().eq("id", c.id), "Campanha apagada.");
          if (ok) abrirAba();
          return ok;
        } : null
      });
    }
    $("novaCamp").addEventListener("click", () => formCamp(null));
    $("corpoCamp").addEventListener("click", async (e) => {
      const estrela = e.target.closest("[data-estrela]");
      if (estrela) {
        const c = lista.find((x) => String(x.id) === estrela.dataset.estrela);
        const novo = !c.favorita;
        if (await gravar("campanhas", (q) => q.update({ favorita: novo }).eq("id", c.id), novo ? "Campanha destacada." : "Destaque tirado.")) {
          c.favorita = novo; desenhar();
        }
        return;
      }
      const tr = e.target.closest("tr[data-id]");
      if (tr) formCamp(lista.find((x) => String(x.id) === tr.dataset.id));
    });
  }

  /* =====================================================================
     5. CHECKLIST PORTFÓLIO (conteúdo do js/biblioteca.js, sem mudar nada)
     ===================================================================== */
  const estadoCheck = { sub: "checklist", abertas: {} };
  const SUB_ABAS = [["checklist", "Checklist do portfólio"], ["referencias", "Referências de vídeo"], ["roteiros", "Roteiros"], ["ideias", "Ideias por nicho"], ["revisar", "Revisar meu roteiro"]];
  const CORES = { coral: "#f6c6b8", rosa: "#f4d6e2", mostarda: "#f3dfa0", terra: "#e7c8b2", oliva: "#dfe3c8", areia: "#efe6d6" };
  let marcadosCache = null;
  let atualizarRevisao = null;

  function abrirReferencia(i) {
    const r = (B.REFERENCIAS || [])[i];
    if (!r) return;
    abrirJanela({
      titulo: r.emoji + " " + r.titulo,
      larga: true,
      corpo: '<div class="ficha" style="display:grid;gap:8px">' +
        '<p class="texto-suave">' + [r.estilo, r.audiencia, r.duracao, r.marca].filter(Boolean).map(esc).join(" · ") + "</p>" +
        "<h3>Gancho</h3><p>" + esc(r.gancho) + "</p>" +
        "<h3>Por que funciona</h3><p>" + esc(r.porque) + "</p>" +
        "<h3>Diferencial</h3><p>" + esc(r.diferencial) + "</p>" +
        "<h3>Erro comum</h3><p>" + esc(r.erro) + "</p>" +
        "<h3>Roteiro</h3>" + blocosTempo(r.roteiro) + "</div>",
      botoes: r.youtube ? [{ texto: "Assistir", link: r.youtube }] : []
    });
  }

  async function abaChecklist(area, aindaAqui) {
    if (!B) {
      area.innerHTML = '<div class="aviso erro">Não encontrei o arquivo js/biblioteca.js. O resto do painel continua funcionando.</div>';
      return;
    }
    const linhas = await ler("marcados", (q) => q.select("chave, marcado"));
    if (!aindaAqui()) return;
    marcadosCache = new Set(linhas.filter((l) => l.marcado !== false).map((l) => l.chave));

    area.innerHTML =
      '<div class="sub-abas" role="tablist" aria-label="Partes do checklist">' +
        SUB_ABAS.map((s) => '<button class="sub-aba" role="tab" type="button" data-sub="' + s[0] + '" aria-selected="' + (estadoCheck.sub === s[0]) + '">' + s[1] + "</button>").join("") +
      "</div>" +
      '<div id="subConteudo" role="tabpanel" style="display:grid;gap:12px"></div>';

    /* Um ouvinte só para cada coisa, mesmo trocando de sub-aba */
    $("subConteudo").addEventListener("change", async (e) => {
      await aoMarcar(e);
      if (estadoCheck.sub === "revisar" && atualizarRevisao) atualizarRevisao();
    });
    $("subConteudo").addEventListener("click", (e) => {
      const b = e.target.closest("[data-ref]");
      if (b) abrirReferencia(Number(b.dataset.ref));
    });
    area.querySelector(".sub-abas").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sub]");
      if (!b) return;
      estadoCheck.sub = b.dataset.sub;
      area.querySelectorAll("[data-sub]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      desenharSub();
    });
    desenharSub();
  }

  async function marcar(chave, ligado) {
    if (ligado) marcadosCache.add(chave); else marcadosCache.delete(chave);
    const ok = ligado
      ? await gravar("marcados", (q) => q.upsert({ chave, marcado: true, atualizado_em: new Date().toISOString() }))
      : await gravar("marcados", (q) => q.delete().eq("chave", chave));
    if (!ok) { if (ligado) marcadosCache.delete(chave); else marcadosCache.add(chave); }
    return ok;
  }
  const barra = (feitos, total) => {
    const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
    return '<div class="progresso-linha"><div class="progresso"><i style="width:' + pct + '%"></i></div><b>' + pct + "%</b></div>";
  };
  const blocosTempo = (lista) => '<div class="blocos">' + (lista || []).map((b) =>
    '<div class="bloco"><span class="tempo">' + esc(b.t) + "</span><div>" + (b.o || "") + "</div></div>").join("") + "</div>";

  function desenharSub() {
    const alvo = $("subConteudo");
    if (!alvo) return;
    const sub = estadoCheck.sub;

    if (sub === "checklist") {
      const secoes = B.CHECKLIST || [];
      const contar = (s) => s.itens.filter((it, i) => marcadosCache.has("checklist:" + s.id + ":" + i)).length;
      const totalItens = secoes.reduce((n, s) => n + s.itens.length, 0);
      const totalFeitos = secoes.reduce((n, s) => n + contar(s), 0);
      alvo.innerHTML =
        '<div class="cartao"><h2>Seu portfólio no geral: ' + totalFeitos + " de " + totalItens + " itens prontos</h2>" + barra(totalFeitos, totalItens) + "</div>" +
        secoes.map((s) => {
          const feitos = contar(s);
          return '<details class="secao-check" data-secao="' + esc(s.id) + '"' + (estadoCheck.abertas[s.id] ? " open" : "") + ">" +
            '<summary><span class="secao-titulo"><span aria-hidden="true">' + esc(s.emoji) + "</span>" + esc(s.nome) +
              ' <span class="resumo">' + esc(s.resumo) + '</span><span class="contagem">' + feitos + " de " + s.itens.length + "</span></span>" +
              barra(feitos, s.itens.length) + "</summary>" +
            '<div class="secao-corpo"><p class="porque"><b>Por que:</b> ' + esc(s.porque) + "</p>" +
              s.itens.map((it, i) => {
                const chave = "checklist:" + s.id + ":" + i;
                return '<label class="item-check"><input type="checkbox" data-chave="' + esc(chave) + '"' + (marcadosCache.has(chave) ? " checked" : "") + "><b>" + esc(it.t) + "</b><small>" + esc(it.d) + "</small></label>";
              }).join("") +
            "</div></details>";
        }).join("");
      alvo.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => { estadoCheck.abertas[d.dataset.secao] = d.open; }));
      return;
    }

    if (sub === "referencias") {
      const refs = B.REFERENCIAS || [];
      alvo.innerHTML = '<div class="grade-refs">' + refs.map((r, i) =>
        '<button class="ref" type="button" data-ref="' + i + '">' +
          '<span class="ref-capa" style="--c:' + (CORES[r.cor] || "var(--gelo)") + '" aria-hidden="true">' + esc(r.emoji) + "</span>" +
          '<span class="ref-info"><b>' + esc(r.titulo) + "</b><span>" + esc(r.estilo) + " · " + esc(r.duracao) + "</span><span>" + esc(r.marca) + "</span></span>" +
        "</button>").join("") + "</div>";
      return;
    }

    if (sub === "roteiros") {
      alvo.innerHTML = (B.TIPOS || []).map((t) =>
        '<details class="secao-check"><summary><span class="secao-titulo"><span aria-hidden="true">' + esc(t.emoji) + "</span>" + esc(t.nome) +
          '<span class="contagem">' + esc(t.duracao) + "</span></span></summary>" +
        '<div class="secao-corpo"><p class="porque"><b>Quando usar:</b> ' + esc(t.porque) + "</p>" + blocosTempo(t.beats) +
          (t.erros && t.erros.length ? '<h3 style="font-size:12px;margin-top:4px">Erros comuns</h3><ul class="lista-erros">' + t.erros.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "") +
        "</div></details>").join("");
      return;
    }

    if (sub === "ideias") {
      alvo.innerHTML =
        (B.COMO_USAR && B.COMO_USAR.length ? '<div class="cartao"><h2>Como usar os ganchos</h2><ul class="lista-erros">' + B.COMO_USAR.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul></div>" : "") +
        '<div class="grade-refs" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + (B.NICHOS || []).map((n) =>
          '<div class="cartao"><h2><span aria-hidden="true">' + esc(n.emoji) + "</span> " + esc(n.nome) + "</h2>" +
            n.ideias.map((i) => '<div class="ideia"><b>' + esc(i.t) + "</b><q>" + esc(i.gancho) + "</q></div>").join("") +
          "</div>").join("") + "</div>";
      return;
    }

    if (sub === "revisar") {
      const blocos = B.REVISAO || [];
      let rascunho = "";
      try { rascunho = localStorage.getItem("rascunhoRoteiro") || ""; } catch (erro) { rascunho = ""; }
      const totalItens = blocos.reduce((n, b) => n + b.itens.length, 0);
      const feitos = () => blocos.reduce((n, b, bi) => n + b.itens.filter((it, ii) => marcadosCache.has("revisao:" + bi + ":" + ii)).length, 0);
      alvo.innerHTML =
        '<div class="revisar-grade revisar">' +
          '<div class="cartao"><h2>Cole aqui o seu roteiro</h2>' +
            '<textarea id="roteiroTexto" aria-label="Seu roteiro" placeholder="Cole ou escreva o roteiro aqui. Ele fica guardado neste navegador.">' + esc(rascunho) + "</textarea>" +
            '<p class="texto-suave" id="contaPalavras" style="margin-top:6px"></p></div>' +
          '<div style="display:grid;gap:12px">' +
            '<div class="cartao"><div class="cartao-topo"><h2 id="revisaoTitulo"></h2><button class="botao botao--leve" type="button" id="limparRevisao">Começar revisão nova</button></div><div id="revisaoBarra"></div></div>' +
            blocos.map((b, bi) => '<div class="cartao"><h2><span aria-hidden="true">' + esc(b.emoji) + "</span> " + esc(b.bloco) + "</h2>" +
              b.itens.map((it, ii) => {
                const chave = "revisao:" + bi + ":" + ii;
                return '<label class="item-check"><input type="checkbox" data-chave="' + esc(chave) + '"' + (marcadosCache.has(chave) ? " checked" : "") + "><b>" + esc(it.t) + "</b><small>" + esc(it.d) + "</small></label>";
              }).join("") + "</div>").join("") +
          "</div>" +
        "</div>";
      const atualizar = () => {
        const f = feitos();
        $("revisaoTitulo").textContent = "Revisão: " + f + " de " + totalItens;
        $("revisaoBarra").innerHTML = barra(f, totalItens);
        const palavras = ($("roteiroTexto").value.trim().match(/\S+/g) || []).length;
        $("contaPalavras").textContent = plural(palavras, "palavra", "palavras");
      };
      atualizar();
      atualizarRevisao = atualizar;
      $("roteiroTexto").addEventListener("input", (e) => {
        try { localStorage.setItem("rascunhoRoteiro", e.target.value); } catch (erro) { /* sem armazenamento */ }
        atualizar();
      });
      $("limparRevisao").addEventListener("click", async () => {
        const chaves = Array.from(marcadosCache).filter((c) => c.indexOf("revisao:") === 0);
        if (!chaves.length) return;
        if (await gravar("marcados", (q) => q.delete().in("chave", chaves), "Revisão zerada.")) {
          chaves.forEach((c) => marcadosCache.delete(c));
          alvo.querySelectorAll('input[data-chave^="revisao:"]').forEach((i) => { i.checked = false; });
          atualizar();
        }
      });
    }
  }

  async function aoMarcar(e) {
    const caixa = e.target.closest("input[data-chave]");
    if (!caixa) return;
    const ok = await marcar(caixa.dataset.chave, caixa.checked);
    if (!ok) caixa.checked = !caixa.checked;
    if (estadoCheck.sub === "checklist") {
      /* Atualiza só as contagens, sem fechar as seções abertas */
      const alvo = $("subConteudo");
      const secoes = B.CHECKLIST || [];
      const contar = (s) => s.itens.filter((it, i) => marcadosCache.has("checklist:" + s.id + ":" + i)).length;
      const totalItens = secoes.reduce((n, s) => n + s.itens.length, 0);
      const totalFeitos = secoes.reduce((n, s) => n + contar(s), 0);
      const geral = alvo.querySelector(".cartao");
      geral.innerHTML = "<h2>Seu portfólio no geral: " + totalFeitos + " de " + totalItens + " itens prontos</h2>" + barra(totalFeitos, totalItens);
      secoes.forEach((s) => {
        const d = alvo.querySelector('details[data-secao="' + s.id + '"]');
        if (!d) return;
        d.querySelector(".contagem").textContent = contar(s) + " de " + s.itens.length;
        d.querySelector("summary .progresso-linha").outerHTML = barra(contar(s), s.itens.length);
      });
    }
  }

  /* Abre a aba do endereço (ou Portfólio) */
  abrirAba();
})();
