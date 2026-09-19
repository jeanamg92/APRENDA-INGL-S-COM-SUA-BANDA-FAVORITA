window.AudioPlayer = (() => {
  const STORAGE = 'semana-audio';
  const PASTA = './assets/audio/';
  const audio = new Audio();
  audio.preload = 'metadata';

  let playlist = [];
  let index = 0;
  let pronto = false;
  let carregandoLista = null;
  let volumeAlvo = 0.72;
  let fadeTimer = null;
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

  const lerJsonLista = async (response) => {
    const texto = (await response.text()).replace(/^\uFEFF/, '').trim();
    const data = JSON.parse(texto);
    const arquivos = Array.isArray(data) ? data : (data.files || data.tracks || []);
    return montarFaixas(arquivos.map(String));
  };

  const listarPeloManifesto = async () => {
    const response = await fetch(`${PASTA}lista.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error('sem_lista');
    return lerJsonLista(response);
  };

  const listarPeloIndiceDaPasta = async () => {
    const response = await fetch(PASTA, { cache: 'no-store' });
    if (!response.ok) throw new Error('pasta_indisponivel');
    const tipo = response.headers.get('content-type') || '';
    const texto = (await response.text()).replace(/^\uFEFF/, '');

    if (tipo.includes('application/json') || texto.trim().startsWith('[') || texto.trim().startsWith('{')) {
      const data = JSON.parse(texto.trim());
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

  const descobrirPlaylist = async () => {
    // Na Hostinger a pasta costuma retornar 403; lista.json e o caminho confiavel.
    try {
      return await listarPeloManifesto();
    } catch (_) {
      return listarPeloIndiceDaPasta();
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

  const play = () => {
    audio.muted = false;
    if (audio.volume < 0.05) audio.volume = volumeAlvo;
    return audio.play().then(() => { salvar(); avisar(); }).catch(() => {});
  };
  const pause = () => {
    cancelarFade();
    audio.pause();
    salvar();
    avisar();
  };
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
    cancelarFade();
    volumeAlvo = Math.min(1, Math.max(0, Number(valor) / 100));
    audio.volume = volumeAlvo;
    salvar();
    avisar();
  };

  const cancelarFade = () => {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  };

  const aguardarAudioPronto = () => new Promise((resolve) => {
    if (audio.readyState >= 2) {
      resolve();
      return;
    }
    const concluir = () => {
      audio.removeEventListener('canplay', concluir);
      audio.removeEventListener('loadeddata', concluir);
      resolve();
    };
    audio.addEventListener('canplay', concluir, { once: true });
    audio.addEventListener('loadeddata', concluir, { once: true });
    setTimeout(concluir, 3000);
  });

  const iniciarFadeVolume = (destino, duracaoMs) => {
    cancelarFade();
    const passos = 28;
    const delta = (destino - audio.volume) / passos;
    const intervalo = duracaoMs / passos;
    let n = 0;
    fadeTimer = setInterval(() => {
      n += 1;
      if (audio.paused) {
        cancelarFade();
        return;
      }
      audio.volume = Math.min(1, Math.max(0, audio.volume + delta));
      if (n >= passos) {
        audio.volume = destino;
        cancelarFade();
      }
      salvar();
      avisar();
    }, intervalo);
  };

  const aguardarGestoParaTocar = (de, destino, duracaoMs) => {
    const liberar = () => {
      document.removeEventListener('pointerdown', liberar, true);
      document.removeEventListener('touchstart', liberar, true);
      document.removeEventListener('keydown', liberar, true);
      document.removeEventListener('click', liberar, true);
      tocarComFade({ de, para: destino, duracaoMs });
    };
    document.addEventListener('pointerdown', liberar, { once: true, capture: true });
    document.addEventListener('touchstart', liberar, { once: true, capture: true });
    document.addEventListener('keydown', liberar, { once: true, capture: true });
    document.addEventListener('click', liberar, { once: true, capture: true });
  };

  const tocarComFade = ({ de = 0, para = volumeAlvo, duracaoMs = 2000 } = {}) => {
    cancelarFade();
    const destino = Math.min(1, Math.max(0, para));
    audio.playsInline = true;

    aguardarAudioPronto().then(async () => {
      audio.volume = 0;
      audio.muted = true;

      // 1) Muted autoplay (geralmente liberado pelos navegadores)
      try {
        await audio.play();
        audio.muted = false;
        audio.volume = Math.min(1, Math.max(0, de));
        iniciarFadeVolume(destino, duracaoMs);
        salvar();
        avisar();
        return;
      } catch (_) {
        audio.muted = false;
      }

      // 2) Tenta com volume zero sem mute
      try {
        audio.volume = 0;
        await audio.play();
        iniciarFadeVolume(destino, duracaoMs);
        salvar();
        avisar();
        return;
      } catch (_) { /* bloqueado */ }

      // 3) Libera no primeiro toque/clique/tecla
      audio.volume = Math.min(1, Math.max(0, de));
      avisar();
      aguardarGestoParaTocar(de, destino, duracaoMs);
    });
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
    const dock = document.querySelector('.site-header #audio-dock');
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
    // Remove cópias órfãs criadas antes do header existir (ficavam no rodapé).
    document.querySelectorAll('#audio-dock').forEach((el) => {
      if (!el.closest('.site-header')) el.remove();
    });

    let dock = document.querySelector('.site-header #audio-dock');
    if (!dock) {
      const tools = document.querySelector('.nav-tools');
      if (!tools) return;
      dock = document.createElement('div');
      dock.id = 'audio-dock';
      dock.className = 'audio-dock';
      dock.setAttribute('aria-label', 'Player de audio');
      tools.prepend(dock);
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

    if (title) title.textContent = e.faixa?.title || '—';
    if (artist) artist.textContent = '';

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
    volumeAlvo = (salvo && typeof salvo.volume === 'number') ? salvo.volume : 0.72;

    const idx = Number.isInteger(salvo?.index) ? Math.min(salvo.index, Math.max(playlist.length - 1, 0)) : 0;
    const time = Number(salvo?.time) || 0;
    carregarFaixa(idx, { autoplay: false, time });

    // So toca sozinho na 1a visita ou se ja estava tocando. Se o usuario pausou, respeita.
    const deveAutoplay = !salvo || salvo.playing === true;
    if (deveAutoplay) {
      tocarComFade({ de: 0, para: volumeAlvo, duracaoMs: 2200 });
    } else {
      audio.volume = volumeAlvo;
      avisar();
    }
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

  const tocarPorNome = (nomeArquivo) => {
    const arquivo = String(nomeArquivo || '').split('/').pop();
    if (!arquivo || !EXTENSAO_AUDIO.test(arquivo)) return;

    let idx = playlist.findIndex((faixa) => faixa.id === arquivo);
    if (idx < 0) {
      playlist = [
        ...playlist,
        {
          id: arquivo,
          title: tituloDeArquivo(arquivo),
          artist: 'Easter egg',
          src: `${PASTA}${encodeURIComponent(arquivo).replace(/%2F/gi, '/')}`
        }
      ];
      idx = playlist.length - 1;
    }

    carregarFaixa(idx, { autoplay: false, time: 0 });
    tocarComFade({ de: 0, para: volumeAlvo, duracaoMs: 1400 });
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
    tocarPorNome,
    get playlist() { return playlist; }
  };
})();
