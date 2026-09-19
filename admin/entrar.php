<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';

if (usuarioLogado()) {
    redirecionar('./index.php');
}

$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf'] ?? '';
    $usuario = trim((string) ($_POST['usuario'] ?? ''));
    $senha = (string) ($_POST['senha'] ?? '');

    if (!validarTokenCsrf(is_string($csrf) ? $csrf : null)) {
        $erro = 'Sessao expirada. Tente de novo.';
    } elseif (loginBloqueado($pdo, $config)) {
        $erro = 'Muitas tentativas. Aguarde alguns minutos.';
    } elseif ($usuario === '' || $senha === '') {
        $erro = 'Preencha usuario e senha.';
    } else {
        $stmt = $pdo->prepare('SELECT id, usuario, senha_hash FROM usuarios WHERE usuario = ? LIMIT 1');
        $stmt->execute([$usuario]);
        $conta = $stmt->fetch();

        if (!$conta || !password_verify($senha, (string) $conta['senha_hash'])) {
            registrarTentativaLogin($pdo);
            $erro = 'Usuario ou senha invalidos.';
        } else {
            limparTentativasLogin($pdo);
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $conta['id'];
            $_SESSION['admin_usuario'] = (string) $conta['usuario'];
            redirecionar('./index.php');
        }
    }
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Entrar · Admin</title>
  <link rel="stylesheet" href="./assets/admin.css" />
</head>
<body class="login-pagina">
  <div class="login-caixa">
    <h1>Painel de edicao</h1>
    <p>Acesso restrito. Uma conta apenas.</p>
    <?php if ($erro !== ''): ?>
      <div class="alerta erro"><?= escapar($erro) ?></div>
    <?php endif; ?>
    <form method="post" class="grade" autocomplete="off">
      <?= campoOcultoCsrf() ?>
      <label>Usuario
        <input type="text" name="usuario" required autofocus />
      </label>
      <label>Senha
        <input type="password" name="senha" required />
      </label>
      <button class="botao" type="submit">Entrar</button>
    </form>
  </div>
</body>
</html>
