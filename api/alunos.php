<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';

if ($id !== '') {
    $stmt = $pdo->prepare('SELECT * FROM alunos WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $linha = $stmt->fetch();
    if (!$linha) {
        responderJson(['erro' => 'Depoimento nao encontrado'], 404);
    }
    responderJson(['aluno' => alunoParaApi($linha)]);
}

responderJson([
    'alunos' => listarAlunos($pdo),
]);
