# Painel admin (PHP + SQLite)

Backend leve para editar artigos e depoimentos na Hostinger.

## Acesso

- Painel: `/admin/entrar.php`
- Usuario inicial: `admin`
- Senha inicial: `Letras2026!`
- Troque a senha no painel no primeiro acesso.

## API publica (somente leitura)

- `GET /api/artigos.php`
- `GET /api/artigos.php?id=slug`
- `GET /api/alunos.php`
- `GET /api/alunos.php?id=slug`

O front tenta carregar essas rotas; se PHP nao estiver disponivel (Live Server), usa `data/articles.js` e `data/students.js`.

## Hostinger

1. Envie a pasta do site para `public_html` (ou subpasta).
2. PHP precisa da extensao `pdo_sqlite` (padrao na Hostinger).
3. A pasta `storage/` precisa de permissao de escrita (o SQLite e criado la na primeira visita).
4. `storage/.htaccess` bloqueia acesso direto ao banco.
5. Use HTTPS (SSL da Hostinger).

## Teste local

```bash
php -S localhost:8080 -t .
```

Abra `http://localhost:8080/admin/entrar.php`.

## Seguranca incluida

- Senha com `password_hash` / `password_verify`
- Sessao HTTP-only (+ Secure em HTTPS)
- Token CSRF nos formularios
- Limite de tentativas de login por IP
- SQL com prepared statements
- Admin com `noindex`
