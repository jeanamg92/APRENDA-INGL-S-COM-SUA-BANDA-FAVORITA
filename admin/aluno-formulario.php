<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

$id = trim((string) ($_GET['id'] ?? ''));
$aluno = [
    'id' => '',
    'name' => '',
    'className' => '6º C',
    'song' => '',
    'artist' => 'The Beatles',
    'color' => 'yellow',
    'avatar' => '',
    'quote' => '',
    'learned' => [],
    'thought' => '',
    'discovered' => '',
    'lesson' => '',
];

if ($id !== '') {
    $stmt = $pdo->prepare('SELECT * FROM alunos WHERE id = ?');
    $stmt->execute([$id]);
    $linha = $stmt->fetch();
    if ($linha) {
        $aluno = alunoParaApi($linha);
    }
}

$cores = ['yellow', 'aqua', 'pink', 'violet', 'orange', 'blue'];
$novo = $aluno['id'] === '';

montarCabecalhoAdmin($novo ? 'Novo depoimento' : 'Editar depoimento', 'alunos');
?>
<form method="post" action="./aluno-salvar.php" class="formulario grade">
  <?= campoOcultoCsrf() ?>
  <input type="hidden" name="id_atual" value="<?= escapar((string) $aluno['id']) ?>" />

  <div class="grade-2">
    <label>ID (slug)
      <input type="text" name="id" value="<?= escapar((string) $aluno['id']) ?>" <?= $novo ? '' : 'readonly' ?> placeholder="ex: sofia" />
      <p class="dica"><?= $novo ? 'Deixe em branco para gerar pelo nome.' : 'ID nao muda depois de criado.' ?></p>
    </label>
    <label>Nome
      <input type="text" name="name" required value="<?= escapar((string) $aluno['name']) ?>" />
    </label>
  </div>

  <div class="grade-2">
    <label>Turma
      <input type="text" name="className" value="<?= escapar((string) $aluno['className']) ?>" />
    </label>
    <label>Iniciais (avatar)
      <input type="text" name="avatar" maxlength="3" value="<?= escapar((string) $aluno['avatar']) ?>" />
    </label>
  </div>

  <div class="grade-2">
    <label>Musica
      <input type="text" name="song" value="<?= escapar((string) $aluno['song']) ?>" />
    </label>
    <label>Artista
      <input type="text" name="artist" value="<?= escapar((string) $aluno['artist']) ?>" />
    </label>
  </div>

  <label>Cor do avatar
    <select name="color">
      <?php foreach ($cores as $cor): ?>
        <option value="<?= escapar($cor) ?>" <?= $aluno['color'] === $cor ? 'selected' : '' ?>><?= escapar($cor) ?></option>
      <?php endforeach; ?>
    </select>
  </label>

  <label>Citacao curta
    <textarea name="quote" rows="2"><?= escapar((string) $aluno['quote']) ?></textarea>
  </label>

  <label>Palavras aprendidas (uma por linha)
    <textarea name="learned" rows="3"><?= escapar(listaParaLinhas($aluno['learned'] ?? [])) ?></textarea>
  </label>

  <label>O que eu achava
    <textarea name="thought" rows="4"><?= escapar((string) $aluno['thought']) ?></textarea>
  </label>

  <label>O que descobri
    <textarea name="discovered" rows="4"><?= escapar((string) $aluno['discovered']) ?></textarea>
  </label>

  <label>O que aprendi
    <textarea name="lesson" rows="4"><?= escapar((string) $aluno['lesson']) ?></textarea>
  </label>

  <div class="acoes">
    <button class="botao" type="submit">Salvar</button>
    <a class="botao secundario" href="./alunos.php">Cancelar</a>
  </div>
</form>
<?php
montarRodapeAdmin();
