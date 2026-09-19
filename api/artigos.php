<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';

if ($id !== '') {
    $stmt = $pdo->prepare('SELECT * FROM artigos WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $linha = $stmt->fetch();
    if (!$linha) {
        responderJson(['erro' => 'Artigo nao encontrado'], 404);
    }
    responderJson(['artigo' => artigoParaApi($linha)]);
}

responderJson([
    'categorias' => obterCategorias($pdo),
    'artigos' => listarArtigos($pdo),
]);
