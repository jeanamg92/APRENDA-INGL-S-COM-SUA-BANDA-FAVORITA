<?php
declare(strict_types=1);

$config = require dirname(__DIR__) . '/config.php';
$caminhoBanco = dirname(__DIR__) . '/storage/site.sqlite';
$caminhoSeed = dirname(__DIR__) . '/storage/seed';

function responderJson(mixed $dados, int $codigo = 200): void
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function obterBanco(string $caminhoBanco, array $config, string $caminhoSeed): PDO
{
    $pasta = dirname($caminhoBanco);
    if (!is_dir($pasta)) {
        mkdir($pasta, 0755, true);
    }

    $novo = !file_exists($caminhoBanco);
    $pdo = new PDO('sqlite:' . $caminhoBanco, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');

    if ($novo) {
        criarTabelas($pdo);
        popularBanco($pdo, $config, $caminhoSeed);
    }

    return $pdo;
}

function criarTabelas(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            criado_em TEXT NOT NULL
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS artigos (
            id TEXT PRIMARY KEY,
            categoria TEXT NOT NULL,
            tag TEXT NOT NULL DEFAULT \'\',
            accent TEXT NOT NULL DEFAULT \'violet\',
            read_time TEXT NOT NULL DEFAULT \'4 min\',
            cover TEXT NOT NULL DEFAULT \'\',
            cover_alt TEXT NOT NULL DEFAULT \'\',
            cover_credit TEXT NOT NULL DEFAULT \'\',
            pt_json TEXT NOT NULL,
            en_json TEXT NOT NULL,
            references_json TEXT NOT NULL DEFAULT \'[]\',
            ordem INTEGER NOT NULL DEFAULT 0,
            atualizado_em TEXT NOT NULL
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS alunos (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            class_name TEXT NOT NULL DEFAULT \'6º C\',
            song TEXT NOT NULL DEFAULT \'\',
            artist TEXT NOT NULL DEFAULT \'The Beatles\',
            color TEXT NOT NULL DEFAULT \'yellow\',
            avatar TEXT NOT NULL DEFAULT \'\',
            quote TEXT NOT NULL DEFAULT \'\',
            learned_json TEXT NOT NULL DEFAULT \'[]\',
            thought TEXT NOT NULL DEFAULT \'\',
            discovered TEXT NOT NULL DEFAULT \'\',
            lesson TEXT NOT NULL DEFAULT \'\',
            ordem INTEGER NOT NULL DEFAULT 0,
            atualizado_em TEXT NOT NULL
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY,
            valor TEXT NOT NULL
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS login_tentativas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            tentado_em INTEGER NOT NULL
        )'
    );
}

function popularBanco(PDO $pdo, array $config, string $caminhoSeed): void
{
    $agora = gmdate('c');
    $hash = password_hash((string) $config['senha_admin_inicial'], PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('INSERT INTO usuarios (usuario, senha_hash, criado_em) VALUES (?, ?, ?)');
    $stmt->execute([(string) $config['usuario_admin'], $hash, $agora]);

    $artigosSeed = lerJsonSeed($caminhoSeed . '/artigos.json');
    $categorias = $artigosSeed['categorias'] ?? ['TODOS', 'TECNOLOGIA', 'HISTÓRIA', 'MÚSICA', 'APRENDENDO', 'CULTURA'];
    $pdo->prepare('INSERT INTO configuracoes (chave, valor) VALUES (?, ?)')
        ->execute(['categorias', json_encode($categorias, JSON_UNESCAPED_UNICODE)]);

    $inserirArtigo = $pdo->prepare(
        'INSERT INTO artigos (
            id, categoria, tag, accent, read_time, cover, cover_alt, cover_credit,
            pt_json, en_json, references_json, ordem, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    foreach (array_values($artigosSeed['artigos'] ?? []) as $indice => $artigo) {
        $inserirArtigo->execute([
            (string) $artigo['id'],
            (string) ($artigo['category'] ?? 'CULTURA'),
            (string) ($artigo['tag'] ?? ''),
            (string) ($artigo['accent'] ?? 'violet'),
            (string) ($artigo['readTime'] ?? '4 min'),
            (string) ($artigo['cover'] ?? ''),
            (string) ($artigo['coverAlt'] ?? ''),
            (string) ($artigo['coverCredit'] ?? ''),
            json_encode($artigo['pt'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
            json_encode($artigo['en'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
            json_encode($artigo['references'] ?? [], JSON_UNESCAPED_UNICODE),
            $indice,
            $agora,
        ]);
    }

    $alunosSeed = lerJsonSeed($caminhoSeed . '/alunos.json');
    $inserirAluno = $pdo->prepare(
        'INSERT INTO alunos (
            id, name, class_name, song, artist, color, avatar, quote,
            learned_json, thought, discovered, lesson, ordem, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    foreach (array_values($alunosSeed['alunos'] ?? []) as $indice => $aluno) {
        $inserirAluno->execute([
            (string) $aluno['id'],
            (string) ($aluno['name'] ?? ''),
            (string) ($aluno['className'] ?? '6º C'),
            (string) ($aluno['song'] ?? ''),
            (string) ($aluno['artist'] ?? 'The Beatles'),
            (string) ($aluno['color'] ?? 'yellow'),
            (string) ($aluno['avatar'] ?? ''),
            (string) ($aluno['quote'] ?? ''),
            json_encode($aluno['learned'] ?? [], JSON_UNESCAPED_UNICODE),
            (string) ($aluno['thought'] ?? ''),
            (string) ($aluno['discovered'] ?? ''),
            (string) ($aluno['lesson'] ?? ''),
            $indice,
            $agora,
        ]);
    }
}

function lerJsonSeed(string $caminho): array
{
    if (!is_file($caminho)) {
        return [];
    }
    $dados = json_decode((string) file_get_contents($caminho), true);
    return is_array($dados) ? $dados : [];
}

function artigoParaApi(array $linha): array
{
    return [
        'id' => $linha['id'],
        'category' => $linha['categoria'],
        'tag' => $linha['tag'],
        'accent' => $linha['accent'],
        'readTime' => $linha['read_time'],
        'cover' => $linha['cover'],
        'coverAlt' => $linha['cover_alt'],
        'coverCredit' => $linha['cover_credit'],
        'pt' => json_decode($linha['pt_json'], true) ?: ['title' => '', 'dek' => '', 'paragraphs' => []],
        'en' => json_decode($linha['en_json'], true) ?: ['title' => '', 'dek' => '', 'paragraphs' => []],
        'references' => json_decode($linha['references_json'], true) ?: [],
    ];
}

function alunoParaApi(array $linha): array
{
    return [
        'id' => $linha['id'],
        'name' => $linha['name'],
        'className' => $linha['class_name'],
        'song' => $linha['song'],
        'artist' => $linha['artist'],
        'color' => $linha['color'],
        'avatar' => $linha['avatar'],
        'quote' => $linha['quote'],
        'learned' => json_decode($linha['learned_json'], true) ?: [],
        'thought' => $linha['thought'],
        'discovered' => $linha['discovered'],
        'lesson' => $linha['lesson'],
    ];
}

function listarArtigos(PDO $pdo): array
{
    $linhas = $pdo->query('SELECT * FROM artigos ORDER BY ordem ASC, id ASC')->fetchAll();
    return array_map('artigoParaApi', $linhas);
}

function listarAlunos(PDO $pdo): array
{
    $linhas = $pdo->query('SELECT * FROM alunos ORDER BY ordem ASC, name ASC')->fetchAll();
    return array_map('alunoParaApi', $linhas);
}

function obterCategorias(PDO $pdo): array
{
    $stmt = $pdo->prepare('SELECT valor FROM configuracoes WHERE chave = ?');
    $stmt->execute(['categorias']);
    $valor = $stmt->fetchColumn();
    $lista = $valor ? json_decode((string) $valor, true) : null;
    return is_array($lista) ? $lista : ['TODOS', 'TECNOLOGIA', 'HISTÓRIA', 'MÚSICA', 'APRENDENDO', 'CULTURA'];
}

$pdo = obterBanco($caminhoBanco, $config, $caminhoSeed);
