<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

$mensagem = isset($_GET['ok']) ? 'Salvo com sucesso.' : '';
$erro = isset($_GET['erro']) ? 'Nao foi possivel concluir a acao.' : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['acao'] ?? '') === 'excluir') {
    if (!validarTokenCsrf((string) ($_POST['csrf'] ?? ''))) {
        redirecionar('./alunos.php?erro=1');
    }
    $id = trim((string) ($_POST['id'] ?? ''));
    if ($id !== '') {
        $pdo->prepare('DELETE FROM alunos WHERE id = ?')->execute([$id]);
    }
    redirecionar('./alunos.php?ok=1');
}

$alunos = listarAlunos($pdo);
montarCabecalhoAdmin('Depoimentos', 'alunos');
?>
<?php if ($mensagem !== ''): ?><div class="alerta ok"><?= escapar($mensagem) ?></div><?php endif; ?>
<?php if ($erro !== ''): ?><div class="alerta erro"><?= escapar($erro) ?></div><?php endif; ?>

<div class="acoes">
  <a class="botao" href="./aluno-formulario.php">Novo depoimento</a>
</div>

<div class="tabela-wrap">
  <table>
    <thead>
      <tr>
        <th>Aluno</th>
        <th>Musica</th>
        <th>ID</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($alunos as $aluno): ?>
        <tr>
          <td>
            <strong><?= escapar((string) $aluno['name']) ?></strong>
            <div class="muted pequeno"><?= escapar((string) $aluno['className']) ?> · <?= escapar((string) $aluno['avatar']) ?></div>
          </td>
          <td><?= escapar((string) $aluno['song']) ?> <span class="muted">— <?= escapar((string) $aluno['artist']) ?></span></td>
          <td class="pequeno muted"><?= escapar((string) $aluno['id']) ?></td>
          <td>
            <div class="acoes" style="margin:0">
              <a class="botao secundario" href="./aluno-formulario.php?id=<?= urlencode((string) $aluno['id']) ?>">Editar</a>
              <form method="post" onsubmit="return confirm('Excluir este depoimento?');">
                <?= campoOcultoCsrf() ?>
                <input type="hidden" name="acao" value="excluir" />
                <input type="hidden" name="id" value="<?= escapar((string) $aluno['id']) ?>" />
                <button class="botao perigo" type="submit">Excluir</button>
              </form>
            </div>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$alunos): ?>
        <tr><td colspan="4" class="muted">Nenhum depoimento ainda.</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>
<?php
montarRodapeAdmin();
