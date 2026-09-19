<?php
declare(strict_types=1);

require dirname(__DIR__) . '/api/bootstrap.php';

function iniciarSessaoSegura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('semana_admin');
    session_start();
}

function escapar(string $valor): string
{
    return htmlspecialchars($valor, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function gerarTokenCsrf(): string
{
    iniciarSessaoSegura();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf'];
}

function validarTokenCsrf(?string $token): bool
{
    iniciarSessaoSegura();
    return is_string($token)
        && isset($_SESSION['csrf'])
        && hash_equals((string) $_SESSION['csrf'], $token);
}

function usuarioLogado(): bool
{
    iniciarSessaoSegura();
    return !empty($_SESSION['admin_id']);
}

function exigirLogin(): void
{
    if (!usuarioLogado()) {
        header('Location: ./entrar.php');
        exit;
    }
}

function obterIpCliente(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 64);
}

function loginBloqueado(PDO $pdo, array $config): bool
{
    $limite = (int) ($config['max_tentativas_login'] ?? 8);
    $janela = (int) ($config['janela_tentativas_segundos'] ?? 900);
    $desde = time() - $janela;
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_tentativas WHERE ip = ? AND tentado_em >= ?');
    $stmt->execute([obterIpCliente(), $desde]);
    return (int) $stmt->fetchColumn() >= $limite;
}

function registrarTentativaLogin(PDO $pdo): void
{
    $pdo->prepare('INSERT INTO login_tentativas (ip, tentado_em) VALUES (?, ?)')
        ->execute([obterIpCliente(), time()]);
    $limiteLimpeza = time() - 86400;
    $pdo->prepare('DELETE FROM login_tentativas WHERE tentado_em < ?')->execute([$limiteLimpeza]);
}

function limparTentativasLogin(PDO $pdo): void
{
    $pdo->prepare('DELETE FROM login_tentativas WHERE ip = ?')->execute([obterIpCliente()]);
}

function slugificar(string $texto): string
{
    $texto = mb_strtolower(trim($texto), 'UTF-8');
    $mapa = [
        'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
        'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n',
    ];
    $texto = strtr($texto, $mapa);
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto) ?? '';
    return trim($texto, '-') ?: ('item-' . bin2hex(random_bytes(3)));
}

function linhasParaLista(string $texto): array
{
    $linhas = preg_split('/\r\n|\r|\n/', $texto) ?: [];
    $saida = [];
    foreach ($linhas as $linha) {
        $linha = trim($linha);
        if ($linha !== '') {
            $saida[] = $linha;
        }
    }
    return $saida;
}

function listaParaLinhas(array $itens): string
{
    return implode("\n", array_map('strval', $itens));
}

function redirecionar(string $url): void
{
    header('Location: ' . $url);
    exit;
}

function montarCabecalhoAdmin(string $titulo, string $ativo = ''): void
{
    $nome = escapar((string) ($GLOBALS['config']['nome_site'] ?? 'Admin'));
    $tituloEsc = escapar($titulo);
    $csrf = escapar(gerarTokenCsrf());
    $link = static function (string $pagina, string $rotulo, string $ativo) {
        $classe = $ativo === $pagina ? ' class="ativo"' : '';
        return '<a href="./' . escapar($pagina) . '.php"' . $classe . '>' . escapar($rotulo) . '</a>';
    };
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" />'
        . '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
        . '<meta name="robots" content="noindex,nofollow" />'
        . '<title>' . $tituloEsc . ' · Admin</title>'
        . '<link rel="stylesheet" href="./assets/admin.css" />'
        . '</head><body>'
        . '<header class="topo"><div class="topo-inner">'
        . '<div><p class="marca">' . $nome . '</p><h1>' . $tituloEsc . '</h1></div>'
        . '<nav class="nav">'
        . $link('index', 'Painel', $ativo)
        . $link('artigos', 'Artigos', $ativo)
        . $link('alunos', 'Depoimentos', $ativo)
        . '<a href="./sair.php">Sair</a>'
        . '</nav></div></header>'
        . '<main class="conteudo"><input type="hidden" id="csrf-global" value="' . $csrf . '" />';
}

function montarRodapeAdmin(): void
{
    echo '</main></body></html>';
}

function campoOcultoCsrf(): string
{
    return '<input type="hidden" name="csrf" value="' . escapar(gerarTokenCsrf()) . '" />';
}

iniciarSessaoSegura();
