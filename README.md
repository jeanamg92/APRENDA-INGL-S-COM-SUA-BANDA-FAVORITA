# Aprenda Inglês com sua Banda Favorita

Template estático para a Semana Midiática 2026. O projeto usa somente HTML5, CSS3 e JavaScript vanilla. Não há Vite, React, framework, backend, banco de dados ou build step.

## Como abrir

Abra `index.html` diretamente no navegador. Para manter a navegação e os módulos JavaScript funcionando em alguns navegadores, também é possível servir a pasta com qualquer servidor HTTP simples.

## Estrutura

- `index.html`, `artigos.html`, `artigo.html`, `alunos.html`, `relato.html`, `sobre.html`
- `css/styles.css`
- `js/app.js`
- `data/articles.js` e `data/students.js`
- `assets/` com as imagens fornecidas no template e duas referências históricas reais dos Beatles

Os dados dos artigos e relatos estão separados para facilitar a substituição futura por uma API ou backend.

## Créditos de imagens

As imagens `assets/beatles-1967.jpg` e `assets/yellow-submarine-album.jpg` foram baixadas do Wikimedia Commons para uso como referências históricas reais no layout:

- [The Beatles 1967](https://commons.wikimedia.org/wiki/File:The_Beatles_1967.jpg), Capitol Records / Henry Grossman, 20 jul. 1967.
- [The Beatles, Yellow Submarine album cover](https://commons.wikimedia.org/wiki/File:TheBeatles-YellowSubmarinealbumcover.jpg), Heinz Edelman, 1969.

Capas dos artigos em `assets/covers/`:

- Yellow Submarine + VHS: arte do filme (Commons) e [VHS videocassette](https://commons.wikimedia.org/wiki/File:VHS_videocassette_-_front.jpg) (LoMit, CC BY-SA 4.0).
- Beatles / fenômeno: mesma foto de 1967 do Commons.
- Demais capas: fotografias reais do Unsplash (estúdio, livros, computador, smartphone).

Consulte as páginas de origem para as condições de reutilização aplicáveis à sua jurisdição.


## Atividade externa

O formulário da home busca música + artista na API pública do LingoClip (`https://api.lingoclip.com/search`) e redireciona para a página da letra (`https://lingoclip.app/ly/{lyrics_id}`). A lógica fica em `js/app.js`.

## Playlist de áudio

Coloque qualquer arquivo `.mp3` em:

`assets/audio/`

Não precisa de nome específico. O player lê os MP3 da pasta (ou de `assets/audio/lista.json` se o servidor não listar o diretório) e toca em ordem **aleatória**.

Se o Live Server não listar a pasta sozinho, atualize `lista.json` com os nomes dos arquivos, por exemplo:

```json
["musica-a.mp3", "outra.mp3"]
```

O player da home e a barra fixa usam a mesma trilha. Ao mudar de página, a posição é salva em `sessionStorage` e a música tenta continuar.
