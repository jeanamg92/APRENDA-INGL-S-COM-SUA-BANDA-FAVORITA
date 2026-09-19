<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';
exigirLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !validarTokenCsrf((string) ($_POST['csrf'] ?? ''))) {
    redirecionar('./artigos.php?erro=1');
}

$idAtual = trim((string) ($_POST['id_atual'] ?? ''));
$id = trim((string) ($_POST['id'] ?? ''));
$tituloPt = trim((string) ($_POST['pt_title'] ?? ''));

if ($id === '') {
    $id = slugificar($tituloPt);
}

if ($tituloPt === '' || $id === '') {
    redirecionar('./artigos.php?erro=1');
}

$pt = [
    'title' => $tituloPt,
    'dek' => trim((string) ($_POST['pt_dek'] ?? '')),
    'paragraphs' => linhasParaLista((string) ($_POST['pt_paragraphs'] ?? '')),
];
$en = [
    'title' => trim((string) ($_POST['en_title'] ?? '')),
    'dek' => trim((string) ($_POST['en_dek'] ?? '')),
    'paragraphs' => linhasParaLista((string) ($_POST['en_paragraphs'] ?? '')),
];
$refs = linhasParaLista((string) ($_POST['references'] ?? ''));
$agora = gmdate('c');

$categoria = trim((string) ($_POST['category'] ?? 'CULTURA'));
$tag = trim((string) ($_POST['tag'] ?? ''));
$accent = trim((string) ($_POST['accent'] ?? 'violet'));
$readTime = trim((string) ($_POST['readTime'] ?? '4 min'));
$cover = trim((string) ($_POST['cover'] ?? ''));
$coverAlt = trim((string) ($_POST['coverAlt'] ?? ''));
$coverCredit = trim((string) ($_POST['coverCredit'] ?? ''));
$ptJson = json_encode($pt, JSON_UNESCAPED_UNICODE);
$enJson = json_encode($en, JSON_UNESCAPED_UNICODE);
$refsJson = json_encode($refs, JSON_UNESCAPED_UNICODE);

try {
    if ($idAtual === '') {
        $ordem = (int) $pdo->query('SELECT COALESCE(MAX(ordem), -1) + 1 FROM artigos')->fetchColumn();
        $pdo->prepare(
            'INSERT INTO artigos (
                id, categoria, tag, accent, read_time, cover, cover_alt, cover_credit,
                pt_json, en_json, references_json, ordem, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, $categoria, $tag, $accent, $readTime, $cover, $coverAlt, $coverCredit,
            $ptJson, $enJson, $refsJson, $ordem, $agora,
        ]);
    } else {
        $pdo->prepare(
            'UPDATE artigos SET
                id = ?, categoria = ?, tag = ?, accent = ?, read_time = ?, cover = ?, cover_alt = ?, cover_credit = ?,
                pt_json = ?, en_json = ?, references_json = ?, atualizado_em = ?
             WHERE id = ?'
        )->execute([
            $id, $categoria, $tag, $accent, $readTime, $cover, $coverAlt, $coverCredit,
            $ptJson, $enJson, $refsJson, $agora, $idAtual,
        ]);
    }
} catch (Throwable $e) {
    redirecionar('./artigos.php?erro=1');
}

redirecionar('./artigos.php?ok=1');
