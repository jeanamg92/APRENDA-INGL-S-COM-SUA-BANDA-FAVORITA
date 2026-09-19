<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !validarTokenCsrf((string) ($_POST['csrf'] ?? ''))) {
    redirecionar('./alunos.php?erro=1');
}

$idAtual = trim((string) ($_POST['id_atual'] ?? ''));
$id = trim((string) ($_POST['id'] ?? ''));
$nome = trim((string) ($_POST['name'] ?? ''));

if ($id === '') {
    $id = slugificar($nome);
}

if ($nome === '' || $id === '') {
    redirecionar('./alunos.php?erro=1');
}

$avatar = trim((string) ($_POST['avatar'] ?? ''));
if ($avatar === '') {
    $avatar = mb_strtoupper(mb_substr($nome, 0, 2, 'UTF-8'), 'UTF-8');
}

$learned = linhasParaLista((string) ($_POST['learned'] ?? ''));
$agora = gmdate('c');

$className = trim((string) ($_POST['className'] ?? '6º C'));
$song = trim((string) ($_POST['song'] ?? ''));
$artist = trim((string) ($_POST['artist'] ?? 'The Beatles'));
$color = trim((string) ($_POST['color'] ?? 'yellow'));
$quote = trim((string) ($_POST['quote'] ?? ''));
$thought = trim((string) ($_POST['thought'] ?? ''));
$discovered = trim((string) ($_POST['discovered'] ?? ''));
$lesson = trim((string) ($_POST['lesson'] ?? ''));
$learnedJson = json_encode($learned, JSON_UNESCAPED_UNICODE);

try {
    if ($idAtual === '') {
        $ordem = (int) $pdo->query('SELECT COALESCE(MAX(ordem), -1) + 1 FROM alunos')->fetchColumn();
        $pdo->prepare(
            'INSERT INTO alunos (
                id, name, class_name, song, artist, color, avatar, quote,
                learned_json, thought, discovered, lesson, ordem, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, $nome, $className, $song, $artist, $color, $avatar, $quote,
            $learnedJson, $thought, $discovered, $lesson, $ordem, $agora,
        ]);
    } else {
        $pdo->prepare(
            'UPDATE alunos SET
                id = ?, name = ?, class_name = ?, song = ?, artist = ?, color = ?, avatar = ?, quote = ?,
                learned_json = ?, thought = ?, discovered = ?, lesson = ?, atualizado_em = ?
             WHERE id = ?'
        )->execute([
            $id, $nome, $className, $song, $artist, $color, $avatar, $quote,
            $learnedJson, $thought, $discovered, $lesson, $agora, $idAtual,
        ]);
    }
} catch (Throwable $e) {
    redirecionar('./alunos.php?erro=1');
}

redirecionar('./alunos.php?ok=1');
