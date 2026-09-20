let articles = window.SITE_ARTICLES || [];
let students = window.SITE_STUDENTS || [];
const i18n = window.SITE_I18N || { pt: {}, en: {} };

const root = document.querySelector('#main-content');
const page = document.body.dataset.page || 'home';
const query = new URLSearchParams(window.location.search);

const LANG_KEY = 'semana-lang';
let idiomaSite = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'pt';

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const linkTo = (file, id = '') => `${file}${id ? `?id=${encodeURIComponent(id)}` : ''}`;
const LINGOCLIP_API = 'https://api.lingoclip.com/search';
const LINGOCLIP_LYRIC = 'https://lingoclip.app/ly';

const t = (chave) => (i18n[idiomaSite] && i18n[idiomaSite][chave] != null ? i18n[idiomaSite][chave] : (i18n.pt?.[chave] ?? chave));
const tf = (chave, vars = {}) => String(t(chave)).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const bandeiraBrasil = `<svg class="lang-flag" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#009c3b"/><polygon points="10,1.5 18.5,7 10,12.5 1.5,7" fill="#ffdf00"/><circle cx="10" cy="7" r="3.2" fill="#002776"/></svg>`;
const bandeiraInglaterra = `<svg class="lang-flag" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#fff"/><rect x="8.2" width="3.6" height="14" fill="#ce1124"/><rect y="5.2" width="20" height="3.6" fill="#ce1124"/></svg>`;

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function scoreLingoClipMatch(item, song, artist) {
  const title = normalizeText(item.title);
  const itemArtist = normalizeText(item.artist);
  const wantedSong = normalizeText(song);
  const wantedArtist = normalizeText(artist);
  let score = Number(item.score) || 0;

  if (item.lang === 'en') score += 40;
  if (title === wantedSong) score += 80;
  else if (title.includes(wantedSong) || wantedSong.includes(title)) score += 45;
  if (itemArtist === wantedArtist) score += 60;
  else if (itemArtist.includes(wantedArtist) || wantedArtist.includes(itemArtist)) score += 30;
  if (/(\blive\b|\blyrics\b|\bcover\b|\baudio\b)/.test(title) && !/(\blive\b|\blyrics\b|\bcover\b|\baudio\b)/.test(wantedSong)) {
    score -= 15;
  }

  return score;
}

function pickLingoClipLyric(items, song, artist) {
  if (!items?.length) return null;
  return [...items].sort((a, b) => scoreLingoClipMatch(b, song, artist) - scoreLingoClipMatch(a, song, artist))[0];
}

async function findLingoClipLyric(song, artist) {
  const busca = `${song} ${artist}`.trim();
  const response = await fetch(`${LINGOCLIP_API}?q=${encodeURIComponent(busca)}`);
  if (!response.ok) throw new Error(`busca_indisponivel_${response.status}`);
  const data = await response.json();
  return pickLingoClipLyric(data?.lyrics?.items || [], song, artist);
}

function aplicarIdiomaDocumento() {
  document.documentElement.lang = idiomaSite === 'en' ? 'en-GB' : 'pt-BR';
  const skip = document.querySelector('.skip-link');
  if (skip) skip.textContent = t('skip');
}

function definirIdioma(novo) {
  idiomaSite = novo === 'en' ? 'en' : 'pt';
  localStorage.setItem(LANG_KEY, idiomaSite);
  aplicarIdiomaDocumento();
  renderizarPagina();
}

function montarDropdownIdioma() {
  const atualFlag = idiomaSite === 'en' ? bandeiraInglaterra : bandeiraBrasil;
  const atualLabel = idiomaSite === 'en' ? 'EN' : 'PT';
  return `
    <div class="lang-switch" data-lang-switch>
      <button class="lang-switch-btn" type="button" aria-expanded="false" aria-haspopup="listbox" aria-label="${escapeHTML(t('idiomaAria'))}">
        ${atualFlag}<span>${atualLabel}</span><span class="lang-caret" aria-hidden="true">▾</span>
      </button>
      <ul class="lang-menu" role="listbox" hidden>
        <li role="option" aria-selected="${idiomaSite === 'pt'}">
          <button type="button" data-set-lang="pt">${bandeiraBrasil}<span>PT</span></button>
        </li>
        <li role="option" aria-selected="${idiomaSite === 'en'}">
          <button type="button" data-set-lang="en">${bandeiraInglaterra}<span>EN</span></button>
        </li>
      </ul>
    </div>`;
}

function ligarDropdownIdioma() {
  const wrap = document.querySelector('[data-lang-switch]');
  if (!wrap) return;
  const btn = wrap.querySelector('.lang-switch-btn');
  const menu = wrap.querySelector('.lang-menu');

  const fechar = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const vaiAbrir = menu.hidden;
    menu.hidden = !vaiAbrir;
    btn.setAttribute('aria-expanded', String(vaiAbrir));
  });

  wrap.querySelectorAll('[data-set-lang]').forEach((opcao) => {
    opcao.addEventListener('click', (event) => {
      event.stopPropagation();
      definirIdioma(opcao.dataset.setLang);
    });
  });

  if (window._fecharMenuIdioma) document.removeEventListener('click', window._fecharMenuIdioma);
  window._fecharMenuIdioma = (event) => {
    if (!wrap.contains(event.target)) fechar();
  };
  document.addEventListener('click', window._fecharMenuIdioma);
}

function renderHeader() {
  const current = page === 'home' ? 'home' : page;
  document.querySelector('#site-header').innerHTML = `
    <header class="site-header">
      <div class="nav-wrap">
        <a class="brand" href="./index.html" aria-label="${escapeHTML(t('brandHome'))}">
          <span class="brand-mark" aria-hidden="true"><span class="signal-bars"><i></i><i></i><i></i><i></i></span><span class="signal-arrow">→</span><span class="signal-text"><i></i><i></i><i></i></span></span>
          <span class="brand-text"><span class="brand-kicker">FROM</span><span class="brand-word">LYRICS <i>TO</i></span><span class="brand-word brand-language">LANGUAGE</span><small>from me to you / english lab</small></span>
        </a>
        <nav class="main-nav" id="main-nav" aria-label="${escapeHTML(t('navAria'))}">
          <a href="./index.html" ${current === 'home' ? 'aria-current="page"' : ''}>${t('navInicio')}</a>
          <a href="./artigos.html" ${current === 'artigos' || current === 'artigo' ? 'aria-current="page"' : ''}>${t('navArtigos')}</a>
          <a href="./alunos.html" ${current === 'alunos' || current === 'relato' ? 'aria-current="page"' : ''}>${t('navRelatos')}</a>
          <a href="./sobre.html" ${current === 'sobre' ? 'aria-current="page"' : ''}>${t('navSobre')}</a>
        </nav>
        <div class="nav-tools">
          <div id="audio-dock" class="audio-dock" aria-label="Player de audio"></div>
          ${montarDropdownIdioma()}
          <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav">MENU</button>
        </div>
      </div>
    </header>`;
  ligarDropdownIdioma();
  window.AudioPlayer?.init();
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  toggle?.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

function renderFooter() {
  document.querySelector('#site-footer').innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <div class="footer-title">${t('footerTitle')}</div>
          <p class="footer-copy">${t('footerCopy')}</p>
          <div class="footer-status">
            <span class="status-chip">BEST VIEWED WITH CURIOSITY</span>
            <span class="status-chip online">● CONNECTION: ONLINE</span>
            <span class="status-chip">VISITOR Nº 00001247</span>
          </div>
        </div>
        <div class="footer-col">
          <h3>${t('footerExplorar')}</h3>
          <a href="./index.html#como-funciona">${t('footerComoAprender')}</a>
          <a href="./artigos.html">${t('footerRevista')}</a>
          <a href="./alunos.html">${t('footerOuvirAlunos')}</a>
        </div>
        <div class="footer-col">
          <h3>${t('footerProjeto')}</h3>
          <a href="./sobre.html">${t('footerSobre')}</a>
          <a href="./index.html#timeline">${t('footerAntesAgora')}</a>
          <a href="./index.html#desafio">${t('footerLingo')}</a>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>${t('footerBottom')}</span>
        <span class="retro-buttons"><b class="retro-button">MUSIC INSIDE</b><b class="retro-button">ENGLISH LEARNER</b><b class="retro-button">MADE WITH HTML</b></span>
      </div>
      <div class="container media-credit">${t('footerMedia')} <a href="https://commons.wikimedia.org/wiki/File:The_Beatles_1967.jpg" target="_blank" rel="noreferrer">The Beatles 1967</a> ${t('footerMediaE')} <a href="https://commons.wikimedia.org/wiki/File:TheBeatles-YellowSubmarinealbumcover.jpg" target="_blank" rel="noreferrer">Yellow Submarine</a>, via Wikimedia Commons.</div>
      <p class="pista-espelhada" title="Pista escondida dos Beatles" aria-label="Pista escondida: turned out nice again">turned out nice again</p>
      <div class="footer-credits">
        <p>${t('footerCredits')}</p>
        <a class="footer-andverso" href="https://andverso.dev.br/" target="_blank" rel="noopener noreferrer">${t('footerAndverso')}</a>
      </div>
    </footer>`;
}

const studentCard = (student) => `
  <article class="student-card reveal">
    <div class="student-top">
      <div><h3>${escapeHTML(student.name)}</h3><p>${escapeHTML(student.className)}</p></div>
      <span class="avatar ${student.color}" aria-hidden="true">${escapeHTML(student.avatar)}</span>
    </div>
    <div class="student-song">${escapeHTML(student.song)}<span>${escapeHTML(student.artist)}</span></div>
    <p class="student-quote">“${escapeHTML(student.quote)}”</p>
    <div class="word-list" aria-label="${escapeHTML(t('palavrasAprendidas'))}">${student.learned.map((word) => `<span>${escapeHTML(word)}</span>`).join('')}</div>
    <a class="link-arrow" href="${linkTo('./relato.html', student.id)}">${t('lerExperiencia')}</a>
  </article>`;

const articleCard = (article, catalog = false) => {
  const texto = article[idiomaSite] || article.pt || article;
  const categoria = t(`cat${article.category}`) !== `cat${article.category}` ? t(`cat${article.category}`) : article.category;
  const capa = article.cover
    ? `<div class="article-cover"><img src="${escapeHTML(article.cover)}" alt="${escapeHTML(article.coverAlt || texto.title)}" loading="lazy" /></div>`
    : '';
  return `
  <article class="article-card ${catalog ? 'catalog-card' : ''} reveal">
    ${capa}
    <div class="article-card-body">
      <span class="tag" style="color: var(--${article.accent})">${escapeHTML(categoria)}</span>
      <h3>${escapeHTML(texto.title)}</h3>
      <p>${escapeHTML(texto.dek)}</p>
      ${catalog ? `<div class="readtime">${escapeHTML(article.readTime)}</div>` : ''}
      <a class="link-arrow" href="${linkTo('./artigo.html', article.id)}">${t('abrirArtigo')}</a>
    </div>
  </article>`;
};

function playerMarkup() {
  return `
    <div class="hero-stage" aria-label="${escapeHTML(t('playerAria'))}">
      <span class="hero-sticker hero-sticker-top hero-sticker-shine" id="issue-sticker" role="button" tabindex="0" aria-label="${escapeHTML(t('stickerAria'))}">ISSUE 01 / 1967→2000</span>
      <figure class="hero-photo-frame" id="hero-beatles-photo" tabindex="0" role="button" aria-label="${escapeHTML(t('photoFlipAria'))}">
        <div class="hero-flip-inner"><div class="hero-flip-face hero-flip-front"><img src="/assets/beatles-1967.jpg" alt="${escapeHTML(t('beatlesPhotoAlt'))}" /></div><div class="hero-flip-face hero-flip-back"><img src="/assets/beatles-1967.jpg" alt="${escapeHTML(t('beatlesFlipAlt'))}" /></div></div>
        <figcaption class="hero-photo-ano" id="hero-beatles-ano">1967</figcaption>
      </figure>
      <figure class="hero-cover" id="hero-yellow-cover" tabindex="0" role="button" aria-label="${escapeHTML(t('yellowCoverAria'))}">
        <img src="./assets/yellow-submarine-album.jpg" alt="${escapeHTML(t('yellowCoverAlt'))}" />
        <figcaption>YELLOW SUBMARINE / 1969</figcaption>
      </figure>
      <div class="dive-card" aria-label="Player da playlist do site">
        <div class="dive-card-top"><span>NOW PLAYING</span><span class="pulse-dot" aria-label="online"></span></div>
        <div class="dive-screen">
          <strong data-player="title">Something</strong>
          <span data-player="artist" hidden></span>
          <div class="fake-wave" aria-hidden="true"></div>
          <div class="progress-line" aria-hidden="false" role="slider" tabindex="0"><i id="player-progress"></i></div>
          <div class="player-time"><span id="player-current">00:00</span><span id="player-duration">00:00</span></div>
          <div class="dive-player-bar" role="group" aria-label="Controles da playlist">
            <button class="dive-player-btn" type="button" data-player="prev" aria-label="${escapeHTML(t('faixaAnterior'))}">‹</button>
            <button class="dive-player-btn dive-player-play play-toggle" type="button" aria-pressed="false"><span aria-hidden="true">▶</span><span>PLAY</span></button>
            <button class="dive-player-btn" type="button" data-player="next" aria-label="${escapeHTML(t('faixaProxima'))}">›</button>
            <label class="dive-player-vol" for="player-volume"><span aria-hidden="true">VOL</span><input id="player-volume" type="range" min="0" max="100" value="72" aria-label="${escapeHTML(t('volumeAria'))}"></label>
          </div>
        </div>
      </div>
      <span class="hero-sticker hero-sticker-bottom">LISTEN / LOOK / LEARN</span>
    </div>`;
}

function renderHome() {
  const steps = t('steps');
  const timelineItems = t('timelineItems');
  const guideSteps = t('guideSteps');
  const albums = [
    ['Please Please Me', '1963', 'please-please-me.jpg', 'A estreia tem urgência de palco: frases curtas, refrões fortes e o começo de uma escuta coletiva.'],
    ['With the Beatles', '1963', 'with-the-beatles.jpg', 'O segundo disco confirma a energia da banda e mostra como repetição e resposta criam vocabulário musical.'],
    ["A Hard Day's Night", '1964', 'a-hard-days-night.jpg', 'Uma trilha quase toda autoral: ótima para perceber como uma expressão cotidiana pode virar título e refrão.'],
    ['Beatles for Sale', '1964', 'beatles-for-sale.jpg', 'Entre cansaço e melodia, o disco abre espaço para letras mais confessionais e nuances de voz.'],
    ['Help!', '1965', 'help.jpg', 'Uma palavra simples carrega um pedido complexo: contexto e entonação mudam o que ouvimos.'],
    ['Rubber Soul', '1965', 'rubber-soul.jpg', 'A linguagem fica mais reflexiva, com imagens, trocadilhos e canções que pedem uma segunda escuta.'],
    ['Revolver', '1966', 'revolver.webp', 'Desenho, fotografia e camadas de som: uma capa que já avisa que a escuta será experimental.'],
    ["Sgt. Pepper’s Lonely Hearts Club Band", '1967', 'sgt-peppers-lonely-hearts.jpg', 'A capa como colagem: personagens, cores e uma banda inventada para mudar a ideia de álbum.'],
    ['Magical Mystery Tour', '1967', 'magical-mystery-tour.jpg', 'Cor, fantasia e palavras estranhas: um convite para ouvir sem tentar traduzir tudo de primeira.'],
    ['The Beatles (White Album)', '1968', 'the-beatles-white-album.jpg', 'Quase sem imagem, a capa faz o silêncio virar escolha — e deixa as músicas ocuparem o espaço.'],
    ['Yellow Submarine', '1969', 'yellow-submarine.jpg', 'Animação, personagens e nonsense: uma oportunidade para investigar palavras que não querem ser literais.'],
    ['Abbey Road', '1969', 'abbey-road.jpg', 'Uma travessia simples que virou imagem universal — e uma porta para falar de sequência, ritmo e memória.'],
    ['Let It Be', '1970', 'let-it-be.jpg', 'O último lançamento de estúdio transforma uma frase de consolo em convite para escutar com calma.']
  ];
  const albumNotesEn = [
    'The debut has stage urgency: short phrases, strong choruses and the beginning of a shared listening experience.',
    'The second record confirms the band’s energy and shows how repetition and response create a musical vocabulary.',
    'An almost entirely self-written soundtrack: perfect for noticing how an everyday expression can become a title and chorus.',
    'Between fatigue and melody, the record makes room for more confessional lyrics and shades of voice.',
    'A simple word carries a complex request: context and intonation change what we hear.',
    'The language becomes more reflective, with images, wordplay and songs that ask for a second listen.',
    'Drawing, photography and layers of sound: a cover that already signals an experimental listening experience.',
    'The cover as collage: characters, colours and an invented band that changed the idea of an album.',
    'Colour, fantasy and strange words: an invitation to listen without trying to translate everything at once.',
    'Almost image-free, the cover turns silence into a choice and lets the songs occupy the space.',
    'Animation, characters and nonsense: a chance to investigate words that do not want to be taken literally.',
    'A simple crossing that became a universal image — and a way to talk about sequence, rhythm and memory.',
    'The final studio release turns a phrase of comfort into an invitation to listen calmly.'
  ];
  const albumOrder = albums.map((album, index) => ({ album, noteEn: albumNotesEn[index] })).reverse();
  const albumPageMarkup = albumOrder.map(({ album, noteEn }, index) => `<article class="album-page ${index === 0 ? 'active' : ''}" data-album-page="${index}"><div class="album-card"><div class="album-cover"><img src="./assets/covers/${album[2]}" alt="${escapeHTML(tf('albumCoverAlt', { title: album[0] }))}" loading="lazy" /></div><div class="album-card-copy"><span>${album[1]}</span><h3>${album[0]}</h3><p>${idiomaSite === 'en' ? noteEn : album[3]}</p></div></div></article>`).join('');
  root.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="container hero-content">
        <div class="hero-copy reveal">
          <div class="eyebrow">${t('heroEyebrow')}</div>
          <h1 id="hero-title" class="display">${t('heroTitle')}</h1>
          <p class="hero-lede">${t('heroLede')}</p>
          <p class="hero-chunk">${t('heroChunk')}</p>
          <div class="hero-actions"><a class="button" href="#projeto">${t('heroCta')} <span aria-hidden="true">→</span></a><a class="link-arrow" style="color:var(--aqua)" href="#como-funciona">${t('heroComo')}</a></div>
          <div class="hero-annotation"><span class="pulse-dot"></span> ${t('heroAnno')}</div>
        </div>
        <div class="hero-side reveal">${playerMarkup()}</div>
      </div>
    </section>
    <div class="marquee"><span>${t('marquee')}</span></div>

    <section class="section" id="projeto">
      <div class="container project-grid">
        <div class="project-copy reveal"><div class="eyebrow">${t('projetoEyebrow')}</div><h2 class="display">${t('projetoTitle')}</h2><p>${t('projetoCopy')}</p><a class="link-arrow" style="color:var(--yellow)" href="#como-funciona">${t('projetoPasso')}</a></div>
        <div class="stat-board reveal"><div class="stat"><span>6º C</span><small>${t('stat6c')}</small></div><div class="stat"><span>${t('statOuvirLabel')}</span><small>${t('statOuvir')}</small></div><div class="stat"><span>${t('statPesquisarLabel')}</span><small>${t('statPesquisar')}</small></div><div class="stat"><span>${t('statInterpretarLabel')}</span><small>${t('statInterpretar')}</small></div></div>
      </div>
    </section>

    <section class="section dark-section" id="como-funciona">
      <div class="container"><div class="section-heading reveal"><div class="eyebrow">${t('metodoEyebrow')}</div><h2 class="display">${t('metodoTitle')}</h2><p>${t('metodoLead')}</p></div>
      <div class="steps">${steps.map(([n, title, d]) => `<article class="step reveal"><div class="step-number">${n}</div><h3>${title}</h3><p>${d}</p></article>`).join('')}</div></div>
    </section>

    <section class="section" id="alunos-preview"><div class="container"><div class="section-heading reveal"><div class="eyebrow">${t('alunosEyebrow')}</div><h2 class="display">${t('alunosTitle')}</h2><p>${t('alunosLead')}</p></div><div class="student-grid">${students.map(studentCard).join('')}</div><div style="text-align:center;margin-top:28px;"><a class="button ghost" href="./alunos.html">${t('alunosTodos')} <span aria-hidden="true">→</span></a></div></div></section>

    <section class="section dark-section" id="timeline"><div class="container"><div class="section-heading reveal"><div class="eyebrow">${t('timelineEyebrow')}</div><h2 class="display">${t('timelineTitle')}</h2><p>${t('timelineLead')}</p></div><div class="timeline-wrap"><div class="timeline">${timelineItems.map(([year, title, text]) => `<article class="timeline-item reveal" tabindex="0"><div class="timeline-dot"></div><div class="timeline-card"><strong>${year}</strong><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div></div><div class="ai-cta reveal"><div class="eyebrow">${t('aiEyebrow')}</div><p>${t('aiLead')}</p><div class="ai-compare"><article><h3>${t('aiEvite')}</h3><p>${t('aiEviteEx')}</p></article><article><h3>${t('aiPrefira')}</h3><p>${t('aiPrefiraEx')}</p></article></div></div></div></section>

    <section class="section album-carousel-section" id="discografia"><div class="container"><div class="album-carousel-heading reveal"><div><div class="eyebrow">${t('albumEyebrow')}</div><h2 class="display">${t('albumTitle')}</h2></div><p>${t('albumLead')}</p></div><div class="album-carousel reveal"><div class="album-pages">${albumPageMarkup}</div><div class="album-carousel-controls"><button type="button" class="album-arrow" data-album-prev aria-label="${escapeHTML(t('albumPrevAria'))}">←</button><span class="album-counter" aria-live="polite"><b data-album-current>01</b> / ${String(albumOrder.length).padStart(2, '0')}</span><button type="button" class="album-arrow" data-album-next aria-label="${escapeHTML(t('albumNextAria'))}">→</button></div></div></div></section>

    <section class="section"><div class="container history-grid"><div class="history-visual reveal"><img src="./assets/beatles-psychic.jpeg" alt="${escapeHTML(t('historyImgAlt'))}" /></div><div class="history-copy reveal"><div class="eyebrow">${t('historyEyebrow')}</div><h2 class="display">${t('historyTitle')}</h2><p>${t('historyP1')}</p><p>${t('historyP2')}</p><div class="history-facts"><span>${t('historyFact1')}</span><span>${t('historyFact2')}</span><span>${t('historyFact3')}</span></div></div></div></section>

    <section class="section guide-home" id="guia-de-escuta"><div class="container"><div class="guide-home-heading"><div><div class="eyebrow">${t('guideEyebrow')}</div><h2 class="display">${t('guideTitle')}</h2></div><p>${t('guideLead')}</p></div><div class="guide-home-grid">${guideSteps.map(([n, title, d]) => `<article><b>${n}</b><h3>${title}</h3><p>${d}</p></article>`).join('')}</div><a class="button ghost" href="#desafio">${t('guideCta')} <span aria-hidden="true">↓</span></a></div></section>

    <section class="section article-feature-section"><div class="container"><div class="article-feature-head reveal"><div><div class="eyebrow">${t('revistaEyebrow')}</div><h2 class="display">${t('revistaTitle')}</h2></div><div class="article-feature-intro"><p>${t('revistaLead')}</p><a class="button alt" href="./artigos.html">${t('revistaAbrir')} <span aria-hidden="true">↗</span></a></div></div><div class="article-feature-layout"><div class="article-feature-lead">${articleCard(articles[0])}</div><div class="article-feature-list">${articles.slice(1, 4).map((article) => articleCard(article)).join('')}</div></div></div></section>

    <section class="section challenge" id="desafio"><div class="container challenge-box"><div class="reveal"><div class="eyebrow">${t('desafioEyebrow')}</div><h2 class="display">${t('desafioTitle')}</h2><p>${t('desafioLead')}</p><p><button type="button" class="challenge-note challenge-note-btn" id="abrir-tutorial-lingo" aria-haspopup="dialog">${t('desafioTutorialBtn')}</button></p></div><form class="challenge-form reveal" id="challenge-form"><div class="field"><label for="song-name">${t('desafioSong')}</label><input id="song-name" name="song" required autocomplete="off" value="Hello, Goodbye" placeholder="Ex.: Hello, Goodbye" /></div><div class="field"><label for="artist-name">${t('desafioArtist')}</label><input id="artist-name" name="artist" required autocomplete="off" value="The Beatles" placeholder="Ex.: The Beatles" /></div><button class="button" type="submit">${t('desafioSubmit')} <span aria-hidden="true">↗</span></button><div id="challenge-result" class="form-result" hidden></div></form></div></section>`;
  bindHomeInteractions();
}

function fecharTutorialLingo() {
  const modal = document.querySelector('#lingo-modal');
  if (!modal) return;
  modal.hidden = true;
  modal.innerHTML = '';
  document.body.style.overflow = '';
}

function abrirTutorialLingo() {
  const modal = document.querySelector('#lingo-modal');
  if (!modal) return;

  modal.hidden = false;
  modal.innerHTML = `
    <div class="sound-panel lingo-panel">
      <h2 id="lingo-title">${t('tutorialTitle')}</h2>
      <p>${t('tutorialLead')}</p>
      <ol class="lingo-steps">
        <li><b>1</b><span>${t('tutorial1')}</span></li>
        <li><b>2</b><span>${t('tutorial2')}</span></li>
        <li><b>3</b><span>${t('tutorial3')}</span></li>
        <li><b>4</b><span>${t('tutorial4')}</span></li>
      </ol>
      <div class="sound-actions">
        <button class="button" type="button" id="fechar-tutorial-lingo">${t('tutorialOk')}</button>
      </div>
    </div>`;

  document.body.style.overflow = 'hidden';
  modal.querySelector('#fechar-tutorial-lingo')?.focus();
  modal.querySelector('#fechar-tutorial-lingo')?.addEventListener('click', fecharTutorialLingo);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) fecharTutorialLingo();
  });
}

function bindIssueSticker() {
  const sticker = document.querySelector('#issue-sticker');
  if (!sticker || sticker.dataset.bound === 'true') return;
  sticker.dataset.bound = 'true';

  let cliques = 0;
  let timerReset;

  const revelar = () => {
    if (sticker.classList.contains('is-revealed')) return;
    sticker.classList.add('is-revealed');
    sticker.classList.remove('hero-sticker-shine');
    sticker.textContent = 'the walrus was paul';
    sticker.setAttribute('aria-label', 'Pista revelada: the walrus was paul');
  };

  const registrarClique = () => {
    if (sticker.classList.contains('is-revealed')) return;
    cliques += 1;
    window.clearTimeout(timerReset);
    if (cliques >= 2) {
      cliques = 0;
      revelar();
      return;
    }
    timerReset = window.setTimeout(() => { cliques = 0; }, 900);
  };

  sticker.addEventListener('click', registrarClique);
  sticker.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      registrarClique();
    }
  });
}

function bindHomeInteractions() {
  bindIssueSticker();
  const heroPhoto = document.querySelector('#hero-beatles-photo');
  if (heroPhoto && heroPhoto.dataset.bound !== 'true') {
    heroPhoto.dataset.bound = 'true';
    const fotoDefault = '/assets/beatles-1967.jpg';
    const fotoPaulRingo = '/assets/beatles-flip.jpg';
    // Uma rodada: 1967 default, 63, 64, 67 (outra), 69, 95, 2024
    const fotosNormais = [
      { src: fotoDefault, ano: '1967' },
      { src: '/assets/flip/beatles-flip-01.jpg', ano: '1963' },
      { src: '/assets/flip/beatles-flip-02.webp', ano: '1964' },
      { src: '/assets/flip/beatles-flip-03.jpg', ano: '1967' },
      { src: '/assets/flip/beatles-flip-04.jpg', ano: '1969' },
      { src: '/assets/flip/beatles-flip-05.jpg', ano: '1995' },
      { src: fotoPaulRingo, ano: '2024' }
    ];
    const frasesTerceira = [
      null,
      null,
      'denovo?',
      'o que voce está procurando aqui?',
      'voce...',
      'ja viu...',
      'essas fotos... right?'
    ];
    // 4a rodada: default, gatilho Revolution 9, demais psicodelicas (sem data)
    const fotosEspeciais = [
      { src: fotoDefault, ano: '1967' },
      { src: '/assets/flip/beatles-psico-08.jpg', ano: '', revolution: true },
      { src: '/assets/flip/beatles-psico-02.jpg', ano: '', psicodelico: true },
      { src: '/assets/flip/beatles-psico-03.jpg', ano: '', psicodelico: true },
      { src: '/assets/flip/beatles-psico-04.jpg', ano: '', psicodelico: true },
      { src: '/assets/flip/beatles-psico-05.jpg', ano: '', psicodelico: true },
      { src: '/assets/flip/beatles-psico-06.jpg', ano: '', psicodelico: true },
      { src: '/assets/flip/beatles-psico-07.jpg', ano: '', psicodelico: true }
    ];
    const indiceGatilho = fotosEspeciais.findIndex((item) => item.revolution);
    const fotosLoopEspecial = fotosEspeciais.slice(indiceGatilho);
    let passoFoto = 1; // tela ja comeca na default (indice 0); proximo flip = 1963
    let faceFrente = true;
    let revolutionTocada = false;
    let flipEmAndamento = false;
    const imgFrente = heroPhoto.querySelector('.hero-flip-front img');
    const imgVerso = heroPhoto.querySelector('.hero-flip-back img');
    const legendaAno = heroPhoto.querySelector('#hero-beatles-ano');
    const msgEl = heroPhoto.querySelector('#hero-beatles-msg');
    if (msgEl) msgEl.remove();

    const prepararFoto = (url) => new Promise((resolve) => {
      const pre = new Image();
      pre.onload = () => resolve(url);
      pre.onerror = () => resolve(url);
      pre.src = url;
    });

    [...fotosNormais, ...fotosEspeciais].forEach((item) => { prepararFoto(item.src); });

    const n = fotosNormais.length;
    const fimDuasRodadas = n * 2;
    const fimTresRodadas = n * 3;

    const pegarProxima = () => {
      // Rodadas 1 e 2: sequencia normal
      if (passoFoto < fimDuasRodadas) {
        return { ...fotosNormais[passoFoto % n] };
      }

      // Rodada 3: mesma sequencia + mensagens
      if (passoFoto < fimTresRodadas) {
        const i = (passoFoto - fimDuasRodadas) % n;
        const base = fotosNormais[i];
        const frase = frasesTerceira[i];
        return frase ? { ...base, msg: frase } : { ...base };
      }

      // Rodada 4: passa uma vez pela sequencia toda; depois loopa a partir do gatilho
      const depois = passoFoto - fimTresRodadas;
      if (depois < fotosEspeciais.length) {
        return fotosEspeciais[depois];
      }
      const i = (depois - fotosEspeciais.length) % fotosLoopEspecial.length;
      return fotosLoopEspecial[i];
    };

    const atualizarLegenda = (proxima) => {
      if (!legendaAno) return;
      if (proxima.msg) {
        legendaAno.classList.add('is-mensagem');
        legendaAno.textContent = proxima.msg;
        return;
      }
      legendaAno.classList.remove('is-mensagem');
      legendaAno.textContent = proxima.ano || '';
    };

    const aplicarFoto = async (img, url) => {
      if (!img) return;
      if (img.getAttribute('src') === url && img.complete) {
        if (img.decode) {
          try { await img.decode(); } catch (_) { /* ignore */ }
        }
        return;
      }
      await prepararFoto(url);
      img.src = url;
      if (img.decode) {
        try { await img.decode(); } catch (_) { /* ignore */ }
      }
    };

    const flipPhoto = async () => {
      if (flipEmAndamento) return;
      flipEmAndamento = true;
      const proxima = pegarProxima();
      const alvoImg = faceFrente ? imgVerso : imgFrente;
      try {
        await aplicarFoto(alvoImg, proxima.src);
        atualizarLegenda(proxima);
        heroPhoto.classList.toggle('is-flipped');
        heroPhoto.classList.toggle('is-psicodelico', !!proxima.psicodelico);
        faceFrente = !faceFrente;
        if (proxima.revolution && !revolutionTocada) {
          revolutionTocada = true;
          const heroEl = document.querySelector('.hero');
          if (heroEl && !heroEl.querySelector('.hero-fundo-revolution')) {
            const fundoRev = document.createElement('div');
            fundoRev.className = 'hero-fundo-revolution';
            fundoRev.setAttribute('aria-hidden', 'true');
            heroEl.prepend(fundoRev);
          }
          window.AudioPlayer?.tocarPorNome?.('Revolution 9.mp3', 9, {
            fadeOutMs: 850,
            fadeInMs: 2800,
            aoTerminarFadeOut: () => {
              requestAnimationFrame(() => {
                heroEl?.classList.add('is-revolution');
              });
            }
          });
        }
        passoFoto += 1;
      } finally {
        window.setTimeout(() => { flipEmAndamento = false; }, 450);
      }
    };
    heroPhoto.addEventListener('click', () => { flipPhoto(); });
    heroPhoto.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flipPhoto(); }
    });
  }
  const yellowCover = document.querySelector('#hero-yellow-cover');
  if (yellowCover && yellowCover.dataset.bound !== 'true') {
    yellowCover.dataset.bound = 'true';
    let yellowClicks = 0;
    let yellowTimer;
    const clickYellow = () => {
      if (yellowCover.classList.contains('is-revealed')) return;
      yellowClicks += 1;
      window.clearTimeout(yellowTimer);
      if (yellowClicks === 3) {
        yellowCover.classList.add('is-revealed');
        const img = yellowCover.querySelector('img');
        if (img) {
          img.src = '/assets/yellow-easter-egg.jpg';
          img.alt = t('yellowRevealedAlt');
        }
        yellowCover.setAttribute('aria-label', t('yellowRevealedAria'));
        yellowClicks = 0;
      } else {
        yellowTimer = window.setTimeout(() => { yellowClicks = 0; }, 950);
      }
    };
    yellowCover.addEventListener('click', clickYellow);
    yellowCover.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); clickYellow(); }
    });
  }
  const albumPages = [...document.querySelectorAll('[data-album-page]')];
  const albumCurrent = document.querySelector('[data-album-current]');
  let albumIndex = 0;
  const showAlbumPage = (nextIndex) => {
    if (!albumPages.length) return;
    albumIndex = (nextIndex + albumPages.length) % albumPages.length;
    albumPages.forEach((page, index) => page.classList.toggle('active', index === albumIndex));
    if (albumCurrent) albumCurrent.textContent = String(albumIndex + 1).padStart(2, '0');
  };
  document.querySelector('[data-album-prev]')?.addEventListener('click', () => showAlbumPage(albumIndex - 1));
  document.querySelector('[data-album-next]')?.addEventListener('click', () => showAlbumPage(albumIndex + 1));
  document.querySelectorAll('.timeline-item').forEach((item) => {
    const activate = () => {
      document.querySelectorAll('.timeline-item').forEach((other) => other.classList.remove('active'));
      item.classList.add('active');
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });
  window.AudioPlayer?.ligarHero();

  document.querySelector('#abrir-tutorial-lingo')?.addEventListener('click', abrirTutorialLingo);
  if (window._escapeLingo) document.removeEventListener('keydown', window._escapeLingo);
  window._escapeLingo = (event) => {
    if (event.key === 'Escape' && !document.querySelector('#lingo-modal')?.hidden) {
      fecharTutorialLingo();
    }
  };
  document.addEventListener('keydown', window._escapeLingo);

  const formChallenge = document.querySelector('#challenge-form');
  formChallenge?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const song = String(form.get('song') || '').trim();
    const artist = String(form.get('artist') || '').trim();
    const result = document.querySelector('#challenge-result');
    const button = formEl.querySelector('button[type="submit"]');
    const buttonLabel = button?.innerHTML;
    const novaAba = window.open('about:blank', '_blank');

    result.hidden = false;
    result.innerHTML = tf('lingoBuscando', { song: escapeHTML(song), artist: escapeHTML(artist) });
    if (button) {
      button.disabled = true;
      button.textContent = t('lingoBuscandoBtn');
    }

    try {
      const match = await findLingoClipLyric(song, artist);
      if (!match?.lyrics_id) {
        if (novaAba) novaAba.close();
        result.innerHTML = tf('lingoNaoAchou', { song: escapeHTML(song), artist: escapeHTML(artist) });
        return;
      }

      const target = `${LINGOCLIP_LYRIC}/${encodeURIComponent(match.lyrics_id)}`;
      if (novaAba) {
        novaAba.opener = null;
        novaAba.location.href = target;
        result.innerHTML = tf('lingoAchouAba', { song: escapeHTML(match.title), artist: escapeHTML(match.artist) });
      } else {
        result.innerHTML = tf('lingoAchouLink', { song: escapeHTML(match.title), artist: escapeHTML(match.artist), url: target });
      }
    } catch (error) {
      console.error(error);
      if (novaAba) novaAba.close();
      result.innerHTML = t('lingoErro');
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = buttonLabel;
      }
    }
  });
}

function rotuloCategoria(cat) {
  const chave = `cat${cat}`;
  const valor = t(chave);
  return valor === chave ? cat : valor;
}

function renderArticles() {
  const categorias = window.SITE_CATEGORIES || ['TODOS', 'TECNOLOGIA', 'HISTÓRIA', 'MÚSICA', 'APRENDENDO', 'CULTURA'];
  root.innerHTML = `<section class="page-hero"><div class="container"><div class="eyebrow">${t('artigosEyebrow')}</div><h1 class="display">${t('artigosTitle')}</h1><p>${t('artigosLead')}</p></div></section><section class="section"><div class="container"><div class="catalog-toolbar"><div class="search-box"><span aria-hidden="true">⌕</span><label class="sr-only" for="article-search">${t('artigosSearch')}</label><input id="article-search" type="search" placeholder="${escapeHTML(t('artigosPlaceholder'))}" /></div><div class="filter-list" role="group" aria-label="${escapeHTML(t('artigosFiltro'))}">${categorias.map((cat, index) => `<button class="filter-button ${index === 0 ? 'active' : ''}" type="button" data-filter="${cat}">${rotuloCategoria(cat)}</button>`).join('')}</div></div><div class="catalog-grid" id="article-list">${articles.map((article) => articleCard(article, true)).join('')}</div><div id="empty-articles" class="empty-state" hidden>${t('artigosVazio')}</div></div></section>`;
  let filter = 'TODOS';
  const search = document.querySelector('#article-search');
  const update = () => {
    const term = search.value.trim().toLowerCase();
    const visible = articles.filter((article) => {
      const texto = article[idiomaSite] || article.pt || article;
      const blob = `${texto.title} ${texto.dek} ${article.category} ${(texto.paragraphs || []).join(' ')}`.toLowerCase();
      return (filter === 'TODOS' || article.category === filter) && blob.includes(term);
    });
    document.querySelector('#article-list').innerHTML = visible.map((article) => articleCard(article, true)).join('');
    document.querySelector('#empty-articles').hidden = visible.length > 0;
    observeReveals();
  };
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    filter = button.dataset.filter;
    update();
  }));
  search.addEventListener('input', update);
}

function montarReferencias(lista = []) {
  if (!lista.length) return '';
  return `<section class="article-refs"><h2>${t('refs')}</h2><ol>${lista.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ol></section>`;
}

function renderArticle() {
  const id = query.get('id');
  const article = articles.find((item) => item.id === id) || articles[0];
  let idiomaArtigo = idiomaSite;

  const pintar = () => {
    const texto = article[idiomaArtigo] || article.pt;
    const rotuloBotao = idiomaArtigo === 'pt' ? t('lerEn') : t('lerPt');
    const categoria = rotuloCategoria(article.category);
    document.title = `${texto.title}`;
    root.innerHTML = `
      <section class="page-hero article-hero">
        <div class="container">
          <div class="eyebrow">${escapeHTML(categoria)} / ${escapeHTML(article.readTime)}</div>
          <h1 class="display" id="article-title">${escapeHTML(texto.title)}</h1>
          <p id="article-dek">${escapeHTML(texto.dek)}</p>
          <button class="lang-psychedelic" type="button" id="toggle-article-lang" aria-pressed="${idiomaArtigo === 'en'}">${rotuloBotao}</button>
        </div>
      </section>
      <section class="section">
        <div class="container article-layout">
          <article class="article-content" lang="${idiomaArtigo === 'en' ? 'en' : 'pt-BR'}">
            <a class="article-back" href="./artigos.html">${t('voltarArtigos')}</a>
            ${article.cover ? `<figure class="article-cover-full"><img src="${escapeHTML(article.cover)}" alt="${escapeHTML(article.coverAlt || texto.title)}" />${article.coverCredit ? `<figcaption>${escapeHTML(article.coverCredit)}</figcaption>` : ''}</figure>` : ''}
            <div id="article-body">${texto.paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('')}</div>
            ${montarReferencias(article.references)}
          </article>
          <aside class="takeaway">
            <h2>${t('experimente')}</h2>
            <ul>
              <li>${t('tip1')}</li>
              <li>${t('tip2')}</li>
              <li>${t('tip3')}</li>
            </ul>
          </aside>
        </div>
      </section>`;

    document.querySelector('#toggle-article-lang')?.addEventListener('click', () => {
      idiomaArtigo = idiomaArtigo === 'pt' ? 'en' : 'pt';
      pintar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    observeReveals();
  };

  pintar();
}

function renderStudents() {
  root.innerHTML = `<section class="page-hero"><div class="container"><div class="eyebrow">${t('alunosPageEyebrow')}</div><h1 class="display">${t('alunosPageTitle')}</h1><p>${t('alunosPageLead')}</p></div></section><section class="section"><div class="container"><div class="profile-grid">${students.map((student) => `<article class="student-card profile-card reveal"><div class="student-top"><div><h3>${escapeHTML(student.name)}</h3><p>${escapeHTML(student.className)}</p></div><span class="avatar ${student.color}" aria-hidden="true">${escapeHTML(student.avatar)}</span></div><div class="student-song">${escapeHTML(student.song)}<span>${escapeHTML(student.artist)}</span></div><p class="student-quote">“${escapeHTML(student.quote)}”</p><div class="word-list">${student.learned.map((word) => `<span>${escapeHTML(word)}</span>`).join('')}</div><a class="link-arrow" href="${linkTo('./relato.html', student.id)}">${t('lerExperiencia')}</a></article>`).join('')}</div></div></section>`;
}

function renderStudent() {
  const student = students.find((item) => item.id === query.get('id')) || students[0];
  document.title = `${student.name}, ${t('relatoTitleSuffix')}`;
  const escutaDe = idiomaSite === 'en' ? `The song through ${escapeHTML(student.name)}’s listening.` : `A música pela escuta de ${escapeHTML(student.name)}.`;
  root.innerHTML = `<section class="page-hero"><div class="container"><div class="eyebrow">${idiomaSite === 'en' ? 'Story' : 'Relato'} / ${escapeHTML(student.className)}</div><h1 class="display">${escutaDe}</h1></div></section><section class="section"><div class="container profile-page"><aside class="profile-hero-card"><span class="avatar ${student.color}" aria-hidden="true">${escapeHTML(student.avatar)}</span><h2>${escapeHTML(student.name)}</h2><p>${escapeHTML(student.className)}</p><p style="margin-top:15px;font-weight:700;color:var(--pink)">${escapeHTML(student.song)}</p><p>${escapeHTML(student.artist)}</p></aside><article class="profile-copy"><a class="article-back" href="./alunos.html">${t('relatoVoltar')}</a><h1>${escapeHTML(student.song)}</h1><div class="songline">${escapeHTML(student.artist)}</div><div class="profile-quote">“${escapeHTML(student.quote)}”</div><div class="profile-columns"><div class="profile-note"><h3>${t('relatoAchava')}</h3><p>${escapeHTML(student.thought)}</p></div><div class="profile-note"><h3>${t('relatoDescobri')}</h3><p>${escapeHTML(student.discovered)}</p></div></div><div class="profile-note" style="margin-top:15px;background:var(--yellow);"><h3>${t('relatoAprendi')}</h3><p>${escapeHTML(student.lesson)}</p></div><div class="word-list" style="margin-top:25px;">${student.learned.map((word) => `<span>${escapeHTML(word)}</span>`).join('')}</div></article></div></section>`;
}

function renderAbout() {
  root.innerHTML = `<section class="page-hero"><div class="container"><div class="eyebrow">${t('sobreEyebrow')}</div><h1 class="display">${t('sobreTitle')}</h1><p>${t('sobreLead')}</p></div></section><section class="section"><div class="container about-grid"><article class="about-card dark reveal"><div class="eyebrow" style="color:var(--aqua)">${t('sobreDeOnde')}</div><h2>${t('sobreOuvir')}</h2><p>${t('sobreP1')}</p><p>${t('sobreP2')}</p></article><article class="about-card reveal"><div class="eyebrow">${t('sobreId')}</div><h2>${t('sobreFan')}</h2><p>${t('sobreIdP')}</p><div class="principles"><div class="principle">${t('principleMusica')}</div><div class="principle">${t('principleIngles')}</div><div class="principle">${t('principleTech')}</div><div class="principle">${t('principleDescoberta')}</div></div></article></div></section><section class="section-tight"><div class="container"><div class="section-heading reveal"><div class="eyebrow">${t('sobreFica')}</div><h2 class="display">${t('sobreFicaTitle')}</h2></div><a class="button" href="./index.html#como-funciona">${t('sobreFicaCta')} <span aria-hidden="true">→</span></a></div></section>`;
}

function setupSoundAndReveals() {
  observeReveals();
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => anchor.addEventListener('click', () => document.querySelector('.main-nav')?.classList.remove('open')));
}

function observeReveals() {
  const items = document.querySelectorAll('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.1 });
  items.forEach((item) => observer.observe(item));
}

function renderizarPagina() {
  aplicarIdiomaDocumento();
  renderHeader();
  renderFooter();
  if (page === 'home') renderHome();
  if (page === 'artigos') renderArticles();
  if (page === 'artigo') renderArticle();
  if (page === 'alunos') renderStudents();
  if (page === 'relato') renderStudent();
  if (page === 'sobre') renderAbout();
  setupSoundAndReveals();
  window.AudioPlayer?.init();
}

async function carregarDadosRemotos() {
  try {
    const [resArtigos, resAlunos] = await Promise.all([
      fetch('./api/artigos.php', { headers: { Accept: 'application/json' } }),
      fetch('./api/alunos.php', { headers: { Accept: 'application/json' } }),
    ]);

    if (resArtigos.ok) {
      const dados = await resArtigos.json();
      if (Array.isArray(dados.artigos) && dados.artigos.length) {
        articles = dados.artigos;
      }
      if (Array.isArray(dados.categorias) && dados.categorias.length) {
        window.SITE_CATEGORIES = dados.categorias;
      }
    }

    if (resAlunos.ok) {
      const dados = await resAlunos.json();
      if (Array.isArray(dados.alunos) && dados.alunos.length) {
        students = dados.alunos;
      }
    }
  } catch (_) {
    // Mantém data/*.js como fallback (Live Server / arquivo local).
  }
}

carregarDadosRemotos().finally(() => {
  renderizarPagina();
});
