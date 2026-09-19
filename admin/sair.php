<?php
declare(strict_types=1);

require __DIR__ . '/_inicio.php';

iniciarSessaoSegura();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
}
session_destroy();
redirecionar('./entrar.php');
