<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

$mensagem = isset($_GET['ok']) ? 'Salvo com sucesso.' : '';
$erro = isset($_GET['erro']) ? 'Nao foi possivel concluir a acao.' : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['acao'] ?? '') === 'excluir') {
    if (!validarTokenCsrf((string) ($_POST['csrf'] ?? ''))) {
        redirecionar('./artigos.php?erro=1');
    }
    $id = trim((string) ($_POST['id'] ?? ''));
    if ($id !== '') {
        $pdo->prepare('DELETE FROM artigos WHERE id = ?')->execute([$id]);
    }
    redirecionar('./artigos.php?ok=1');
}

$artigos = listarArtigos($pdo);
montarCabecalhoAdmin('Artigos', 'artigos');
?>
<?php if ($mensagem !== ''): ?><div class="alerta ok"><?= escapar($mensagem) ?></div><?php endif; ?>
<?php if ($erro !== ''): ?><div class="alerta erro"><?= escapar($erro) ?></div><?php endif; ?>

<div class="acoes">
  <a class="botao" href="./artigo-formulario.php">Novo artigo</a>
</div>

<div class="tabela-wrap">
  <table>
    <thead>
      <tr>
        <th>Titulo (PT)</th>
        <th>Categoria</th>
        <th>ID</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($artigos as $artigo): ?>
        <tr>
          <td>
            <strong><?= escapar((string) ($artigo['pt']['title'] ?? '')) ?></strong>
            <div class="muted pequeno"><?= escapar((string) ($artigo['tag'] ?? '')) ?> · <?= escapar((string) ($artigo['readTime'] ?? '')) ?></div>
          </td>
          <td><?= escapar((string) $artigo['category']) ?></td>
          <td class="pequeno muted"><?= escapar((string) $artigo['id']) ?></td>
          <td>
            <div class="acoes" style="margin:0">
              <a class="botao secundario" href="./artigo-formulario.php?id=<?= urlencode((string) $artigo['id']) ?>">Editar</a>
              <form method="post" onsubmit="return confirm('Excluir este artigo?');">
                <?= campoOcultoCsrf() ?>
                <input type="hidden" name="acao" value="excluir" />
                <input type="hidden" name="id" value="<?= escapar((string) $artigo['id']) ?>" />
                <button class="botao perigo" type="submit">Excluir</button>
              </form>
            </div>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$artigos): ?>
        <tr><td colspan="4" class="muted">Nenhum artigo ainda.</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>
<?php
montarRodapeAdmin();
