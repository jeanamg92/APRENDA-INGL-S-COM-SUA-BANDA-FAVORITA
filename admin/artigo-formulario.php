<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

$id = trim((string) ($_GET['id'] ?? ''));
$artigo = [
    'id' => '',
    'category' => 'CULTURA',
    'tag' => '',
    'accent' => 'violet',
    'readTime' => '4 min',
    'cover' => '',
    'coverAlt' => '',
    'coverCredit' => '',
    'pt' => ['title' => '', 'dek' => '', 'paragraphs' => []],
    'en' => ['title' => '', 'dek' => '', 'paragraphs' => []],
    'references' => [],
];

if ($id !== '') {
    $stmt = $pdo->prepare('SELECT * FROM artigos WHERE id = ?');
    $stmt->execute([$id]);
    $linha = $stmt->fetch();
    if ($linha) {
        $artigo = artigoParaApi($linha);
    }
}

$categorias = array_values(array_filter(obterCategorias($pdo), static fn ($c) => $c !== 'TODOS'));
$acentos = ['violet', 'yellow', 'pink', 'aqua', 'orange', 'blue'];
$novo = $artigo['id'] === '';

montarCabecalhoAdmin($novo ? 'Novo artigo' : 'Editar artigo', 'artigos');
?>
<form method="post" action="./artigo-salvar.php" class="formulario grade">
  <?= campoOcultoCsrf() ?>
  <input type="hidden" name="id_atual" value="<?= escapar((string) $artigo['id']) ?>" />

  <div class="grade-2">
    <label>ID (slug)
      <input type="text" name="id" value="<?= escapar((string) $artigo['id']) ?>" <?= $novo ? '' : 'readonly' ?> placeholder="ex: now-and-then-ia" />
      <p class="dica"><?= $novo ? 'Deixe em branco para gerar pelo titulo em portugues.' : 'ID nao muda depois de criado.' ?></p>
    </label>
    <label>Categoria
      <select name="category">
        <?php foreach ($categorias as $cat): ?>
          <option value="<?= escapar($cat) ?>" <?= $artigo['category'] === $cat ? 'selected' : '' ?>><?= escapar($cat) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
  </div>

  <div class="grade-2">
    <label>Tag
      <input type="text" name="tag" value="<?= escapar((string) $artigo['tag']) ?>" />
    </label>
    <label>Tempo de leitura
      <input type="text" name="readTime" value="<?= escapar((string) $artigo['readTime']) ?>" />
    </label>
  </div>

  <div class="grade-2">
    <label>Cor (accent)
      <select name="accent">
        <?php foreach ($acentos as $cor): ?>
          <option value="<?= escapar($cor) ?>" <?= $artigo['accent'] === $cor ? 'selected' : '' ?>><?= escapar($cor) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Capa (caminho da imagem)
      <input type="text" name="cover" value="<?= escapar((string) $artigo['cover']) ?>" placeholder="./assets/covers/..." />
    </label>
  </div>

  <div class="grade-2">
    <label>Alt da capa
      <input type="text" name="coverAlt" value="<?= escapar((string) $artigo['coverAlt']) ?>" />
    </label>
    <label>Credito da capa
      <input type="text" name="coverCredit" value="<?= escapar((string) $artigo['coverCredit']) ?>" />
    </label>
  </div>

  <h2>Portugues</h2>
  <label>Titulo
    <input type="text" name="pt_title" required value="<?= escapar((string) ($artigo['pt']['title'] ?? '')) ?>" />
  </label>
  <label>Linha de apoio (dek)
    <textarea name="pt_dek" rows="2"><?= escapar((string) ($artigo['pt']['dek'] ?? '')) ?></textarea>
  </label>
  <label>Paragrafos (um por linha)
    <textarea name="pt_paragraphs" rows="8"><?= escapar(listaParaLinhas($artigo['pt']['paragraphs'] ?? [])) ?></textarea>
  </label>

  <h2>Ingles</h2>
  <label>Title
    <input type="text" name="en_title" value="<?= escapar((string) ($artigo['en']['title'] ?? '')) ?>" />
  </label>
  <label>Dek
    <textarea name="en_dek" rows="2"><?= escapar((string) ($artigo['en']['dek'] ?? '')) ?></textarea>
  </label>
  <label>Paragraphs (one per line)
    <textarea name="en_paragraphs" rows="8"><?= escapar(listaParaLinhas($artigo['en']['paragraphs'] ?? [])) ?></textarea>
  </label>

  <label>Referencias (uma por linha)
    <textarea name="references" rows="5"><?= escapar(listaParaLinhas($artigo['references'] ?? [])) ?></textarea>
  </label>

  <div class="acoes">
    <button class="botao" type="submit">Salvar</button>
    <a class="botao secundario" href="./artigos.php">Cancelar</a>
  </div>
</form>
<?php
montarRodapeAdmin();
