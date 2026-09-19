window.AudioPlayer = (() => {
  const STORAGE = 'semana-audio';
  const PASTA = './assets/audio/';
  const audio = new Audio();
  audio.preload = 'metadata';

  let playlist = [];
  let index = 0;
  let pronto = false;
  let carregandoLista = null;
  const ouvintes = new Set();

  const formatarTempo = (segundos) => {
    if (!Number.isFinite(segundos) || segundos < 0) return '00:00';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const EXTENSAO_AUDIO = /\.(mp3|m4a)$/i;

  const tituloDeArquivo = (nome) => decodeURIComponent(nome)
    .replace(EXTENSAO_AUDIO, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Faixa';

  const embaralhar = (lista) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  const montarFaixas = (arquivos) => arquivos
    .filter((nome) => EXTENSAO_AUDIO.test(nome))
    .map((nome) => {
      const arquivo = nome.split('/').pop().split('?')[0];
      return {
        id: arquivo,
        title: tituloDeArquivo(arquivo),
        artist: 'Playlist',
        src: `${PASTA}${encodeURIComponent(arquivo).replace(/%2F/gi, '/')}`
      };
    });

  const listarPeloIndiceDaPasta = async () => {
    const response = await fetch(PASTA, { cache: 'no-store' });
    if (!response.ok) throw new Error('pasta_indisponivel');
    const tipo = response.headers.get('content-type') || '';
    const texto = await response.text();

    if (tipo.includes('application/json') || texto.trim().startsWith('[') || texto.trim().startsWith('{')) {
      const data = JSON.parse(texto);
      const arquivos = Array.isArray(data) ? data : (data.files || data.tracks || []);
      return montarFaixas(arquivos.map(String));
    }

    const encontrados = new Set();
    for (const match of texto.matchAll(/href\s*=\s*["']([^"']+\.(?:mp3|m4a))["']/gi)) {
      const bruto = decodeURIComponent(match[1]).replace(/^\.\//, '');
      const arquivo = bruto.split('/').pop();
      if (arquivo && !arquivo.startsWith('?')) encontrados.add(arquivo);
    }
    if (!encontrados.size) throw new Error('nenhum_audio_no_indice');
    return montarFaixas([...encontrados]);
  };

  const listarPeloManifesto = async () => {
    const response = await fetch(`${PASTA}lista.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error('sem_lista');
    const data = await response.json();
    const arquivos = Array.isArray(data) ? data : (data.files || []);
    return montarFaixas(arquivos.map(String));
  };

  const descobrirPlaylist = async () => {
    try {
      return await listarPeloIndiceDaPasta();
    } catch (_) {
      return listarPeloManifesto();
    }
  };

  const faixaAtual = () => playlist[index] || playlist[0];

  const avisar = () => {
    ouvintes.forEach((fn) => {
      try { fn(estado()); } catch (e) { console.error(e); }
    });
    atualizarDock();
    sincronizarHero();
  };

  const salvar = () => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify({
        order: playlist.map((f) => f.id),
        index,
        time: audio.currentTime || 0,
        playing: !audio.paused,
        volume: audio.volume
      }));
    } catch (_) { /* ignore */ }
  };

  const carregarEstado = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  };

  const carregarFaixa = (novoIndex, { autoplay = false, time = 0 } = {}) => {
    if (!playlist.length) return;
    index = ((novoIndex % playlist.length) + playlist.length) % playlist.length;
    const faixa = faixaAtual();
    if ((audio.getAttribute('src') || '') !== faixa.src) {
      audio.src = faixa.src;
    }

    const aplicarTempo = () => {
      try {
        if (time > 0 && Number.isFinite(time)) audio.currentTime = time;
      } catch (_) { /* ignore */ }
    };

    if (audio.readyState >= 1) aplicarTempo();
    else audio.addEventListener('loadedmetadata', aplicarTempo, { once: true });

    if (autoplay) audio.play().catch(() => {});
    salvar();
    avisar();
  };

  const estado = () => ({
    index,
    faixa: faixaAtual(),
    playing: !audio.paused,
    current: audio.currentTime || 0,
    duration: audio.duration || 0,
    volume: audio.volume,
    currentLabel: formatarTempo(audio.currentTime || 0),
    durationLabel: formatarTempo(audio.duration || 0),
    progress: audio.duration ? (audio.currentTime / audio.duration) * 100 : 0
  });

  const play = () => audio.play().then(() => { salvar(); avisar(); }).catch(() => {});
  const pause = () => { audio.pause(); salvar(); avisar(); };
  const toggle = () => (audio.paused ? play() : pause());
  const next = () => carregarFaixa(index + 1, { autoplay: true });
  const prev = () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      salvar();
      avisar();
      return;
    }
    carregarFaixa(index - 1, { autoplay: !audio.paused });
  };
  const setVolume = (valor) => {
    audio.volume = Math.min(1, Math.max(0, Number(valor) / 100));
    salvar();
    avisar();
  };
  const seekRatio = (ratio) => {
    if (!audio.duration) return;
    audio.currentTime = Math.min(1, Math.max(0, ratio)) * audio.duration;
    salvar();
    avisar();
  };

  const on = (fn) => {
    ouvintes.add(fn);
    fn(estado());
    return () => ouvintes.delete(fn);
  };

  const atualizarDock = () => {
    const dock = document.querySelector('#audio-dock');
    if (!dock) return;
    const e = estado();
    const playBtn = dock.querySelector('[data-audio="play"]');
    const titleEl = dock.querySelector('[data-audio="title"]');
    if (titleEl) {
      const texto = e.faixa ? `${e.faixa.title} — ${e.faixa.artist}` : 'solte mp3/m4a em /assets/audio';
      titleEl.textContent = texto;
    }
    dock.querySelector('[data-audio="current"]').textContent = e.currentLabel;
    dock.querySelector('[data-audio="duration"]').textContent = e.durationLabel;
    const bar = dock.querySelector('[data-audio="progress"]');
    if (bar) bar.style.width = `${e.progress}%`;
    if (playBtn) {
      playBtn.setAttribute('aria-pressed', String(e.playing));
      playBtn.textContent = e.playing ? 'Ⅱ' : '▶';
      playBtn.title = e.playing ? 'Pause' : 'Play';
    }
    const vol = dock.querySelector('[data-audio="volume"]');
    if (vol && document.activeElement !== vol) vol.value = String(Math.round(e.volume * 100));
    dock.classList.toggle('is-playing', e.playing);
  };

  const montarDock = () => {
    let dock = document.querySelector('#audio-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'audio-dock';
      dock.className = 'audio-dock';
      const header = document.querySelector('.site-header');
      if (header) header.appendChild(dock);
      else document.body.appendChild(dock);
    }
    if (dock.dataset.bound === 'true' && dock.querySelector('[data-audio="play"]')) {
      atualizarDock();
      return;
    }
    dock.dataset.bound = 'true';
    dock.innerHTML = `
      <div class="audio-dock-inner" role="group" aria-label="Player de audio">
        <span class="audio-dock-badge" aria-hidden="true">♪</span>
        <div class="audio-dock-controls">
          <button type="button" data-audio="prev" title="Anterior" aria-label="Faixa anterior">‹‹</button>
          <button type="button" data-audio="play" title="Play" aria-pressed="false" aria-label="Play ou pause">▶</button>
          <button type="button" data-audio="next" title="Próxima" aria-label="Próxima faixa">››</button>
        </div>
        <div class="audio-dock-lcd">
          <div class="audio-dock-marquee"><span data-audio="title">—</span></div>
          <button type="button" class="audio-dock-progress" data-audio="seek" aria-label="Progresso">
            <i data-audio="progress"></i>
          </button>
        </div>
        <div class="audio-dock-time"><span data-audio="current">00:00</span>/<span data-audio="duration">00:00</span></div>
        <label class="audio-dock-vol" title="Volume">
          <span aria-hidden="true">VOL</span>
          <input data-audio="volume" type="range" min="0" max="100" value="72" />
        </label>
      </div>`;

    dock.querySelector('[data-audio="play"]').onclick = () => toggle();
    dock.querySelector('[data-audio="prev"]').onclick = () => prev();
    dock.querySelector('[data-audio="next"]').onclick = () => next();
    dock.querySelector('[data-audio="volume"]').oninput = (event) => setVolume(event.target.value);
    dock.querySelector('[data-audio="seek"]').onclick = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      seekRatio((event.clientX - rect.left) / rect.width);
    };
    atualizarDock();
  };

  const sincronizarHero = () => {
    const card = document.querySelector('.dive-card');
    if (!card) return;
    const e = estado();
    const title = card.querySelector('[data-player="title"]');
    const artist = card.querySelector('[data-player="artist"]');
    const current = card.querySelector('#player-current');
    const duration = card.querySelector('#player-duration');
    const progress = card.querySelector('#player-progress');
    const playBtn = card.querySelector('.play-toggle');
    const volume = card.querySelector('#player-volume');

    if (title) title.textContent = e.faixa?.title || 'Sem audio';
    if (artist) artist.textContent = e.faixa ? 'assets/audio · aleatório' : 'solte .mp3 ou .m4a em assets/audio';
    if (current) current.textContent = e.currentLabel;
    if (duration) duration.textContent = e.durationLabel;
    if (progress) progress.style.width = `${e.progress}%`;
    if (playBtn) {
      playBtn.setAttribute('aria-pressed', String(e.playing));
      const icon = playBtn.querySelector('span:first-child');
      const label = playBtn.querySelector('span:last-child');
      if (icon) icon.textContent = e.playing ? 'Ⅱ' : '▶';
      if (label) label.textContent = e.playing ? 'PAUSE' : 'PLAY';
    }
    if (volume && document.activeElement !== volume) volume.value = String(Math.round(e.volume * 100));
  };

  const ligarHero = () => {
    const card = document.querySelector('.dive-card');
    if (!card) return;
    // se a home re-renderizou o card, precisa religar os controles
    if (card.dataset.audioBound !== 'true') {
      card.dataset.audioBound = 'true';
      card.querySelector('.play-toggle')?.addEventListener('click', () => toggle());
      card.querySelector('[data-player="prev"]')?.addEventListener('click', () => prev());
      card.querySelector('[data-player="next"]')?.addEventListener('click', () => next());
      card.querySelector('#player-volume')?.addEventListener('input', (event) => setVolume(event.target.value));
      card.querySelector('.progress-line')?.addEventListener('click', (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        seekRatio((event.clientX - rect.left) / rect.width);
      });
    }
    sincronizarHero();
  };

  audio.addEventListener('timeupdate', () => { salvar(); avisar(); });
  audio.addEventListener('play', () => { salvar(); avisar(); });
  audio.addEventListener('pause', () => { salvar(); avisar(); });
  audio.addEventListener('ended', () => next());
  audio.addEventListener('loadedmetadata', () => avisar());
  window.addEventListener('pagehide', salvar);
  window.addEventListener('beforeunload', salvar);

  const aplicarPlaylist = (faixas, salvo) => {
    let lista = faixas;
    if (salvo?.order?.length) {
      const mapa = new Map(faixas.map((f) => [f.id, f]));
      const restaurada = salvo.order.map((id) => mapa.get(id)).filter(Boolean);
      const faltando = faixas.filter((f) => !salvo.order.includes(f.id));
      if (restaurada.length) lista = [...restaurada, ...embaralhar(faltando)];
      else lista = embaralhar(faixas);
    } else {
      lista = embaralhar(faixas);
    }
    playlist = lista;
    if (salvo && typeof salvo.volume === 'number') audio.volume = salvo.volume;
    else audio.volume = 0.72;

    const idx = Number.isInteger(salvo?.index) ? Math.min(salvo.index, Math.max(playlist.length - 1, 0)) : 0;
    const time = Number(salvo?.time) || 0;
    carregarFaixa(idx, { autoplay: false, time });
    if (salvo?.playing) audio.play().catch(() => {});
  };

  const init = () => {
    montarDock();
    ligarHero();

    if (!carregandoLista) {
      const salvo = carregarEstado();
      carregandoLista = descobrirPlaylist()
        .then((faixas) => {
          if (!faixas.length) throw new Error('vazia');
          aplicarPlaylist(faixas, salvo);
        })
        .catch(() => {
          playlist = [];
          avisar();
        })
        .finally(() => {
          pronto = true;
          ligarHero();
        });
    } else {
      carregandoLista.then(() => ligarHero());
    }
  };

  return {
    init,
    play,
    pause,
    toggle,
    next,
    prev,
    setVolume,
    seekRatio,
    on,
    estado,
    ligarHero,
    get playlist() { return playlist; }
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.AudioPlayer?.init();
});
