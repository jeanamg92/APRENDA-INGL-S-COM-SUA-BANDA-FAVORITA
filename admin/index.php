<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

$mensagem = '';
$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['acao'] ?? '') === 'trocar_senha') {
    if (!validarTokenCsrf((string) ($_POST['csrf'] ?? ''))) {
        $erro = 'Sessao expirada.';
    } else {
        $atual = (string) ($_POST['senha_atual'] ?? '');
        $nova = (string) ($_POST['senha_nova'] ?? '');
        $confirma = (string) ($_POST['senha_confirma'] ?? '');

        $stmt = $pdo->prepare('SELECT id, senha_hash FROM usuarios WHERE id = ?');
        $stmt->execute([(int) $_SESSION['admin_id']]);
        $conta = $stmt->fetch();

        if (!$conta || !password_verify($atual, (string) $conta['senha_hash'])) {
            $erro = 'Senha atual incorreta.';
        } elseif (strlen($nova) < 8) {
            $erro = 'A nova senha precisa ter pelo menos 8 caracteres.';
        } elseif ($nova !== $confirma) {
            $erro = 'A confirmacao nao confere.';
        } else {
            $hash = password_hash($nova, PASSWORD_DEFAULT);
            $pdo->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')
                ->execute([$hash, (int) $conta['id']]);
            $mensagem = 'Senha atualizada.';
        }
    }
}

$totalArtigos = (int) $pdo->query('SELECT COUNT(*) FROM artigos')->fetchColumn();
$totalAlunos = (int) $pdo->query('SELECT COUNT(*) FROM alunos')->fetchColumn();

montarCabecalhoAdmin('Painel', 'index');
?>
<?php if ($mensagem !== ''): ?><div class="alerta ok"><?= escapar($mensagem) ?></div><?php endif; ?>
<?php if ($erro !== ''): ?><div class="alerta erro"><?= escapar($erro) ?></div><?php endif; ?>

<div class="cartoes">
  <div class="cartao">
    <span class="muted">Artigos</span>
    <strong><?= $totalArtigos ?></strong>
  </div>
  <div class="cartao">
    <span class="muted">Depoimentos</span>
    <strong><?= $totalAlunos ?></strong>
  </div>
  <div class="cartao">
    <span class="muted">Logado como</span>
    <strong style="font-size:1.1rem"><?= escapar((string) ($_SESSION['admin_usuario'] ?? '')) ?></strong>
  </div>
</div>

<div class="acoes">
  <a class="botao" href="./artigos.php">Editar artigos</a>
  <a class="botao secundario" href="./alunos.php">Editar depoimentos</a>
  <a class="botao secundario" href="../index.html" target="_blank" rel="noopener">Ver site</a>
</div>

<section class="formulario" style="margin-top:1.5rem">
  <h2 style="margin-top:0">Trocar senha</h2>
  <p class="muted pequeno">Recomendado depois do primeiro acesso.</p>
  <form method="post" class="grade" style="margin-top:1rem">
    <?= campoOcultoCsrf() ?>
    <input type="hidden" name="acao" value="trocar_senha" />
    <div class="grade-2">
      <label>Senha atual
        <input type="password" name="senha_atual" required autocomplete="current-password" />
      </label>
      <label>Nova senha
        <input type="password" name="senha_nova" required minlength="8" autocomplete="new-password" />
      </label>
    </div>
    <label>Confirmar nova senha
      <input type="password" name="senha_confirma" required minlength="8" autocomplete="new-password" />
    </label>
    <button class="botao" type="submit">Salvar senha</button>
  </form>
</section>
<?php
montarRodapeAdmin();
