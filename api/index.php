<?php
require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/email.php';
require __DIR__ . '/lib/files.php';
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/projects.php';
require __DIR__ . '/routes/admin.php';
require __DIR__ . '/routes/custom_furniture.php';
require __DIR__ . '/routes/styled_assets.php';

set_exception_handler(function (Throwable $e) {
  error_log($e->getMessage() . "\n" . $e->getTraceAsString());
  server_error('Erro interno no servidor');
});

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$parts = array_values(array_filter(explode('/', $path)));
$method = $_SERVER['REQUEST_METHOD'];

if (($parts[0] ?? '') !== 'api') not_found();
if (($parts[1] ?? '') === 'health') json_response(['ok' => true]);

if (($parts[1] ?? '') === 'styled-assets' && $method === 'GET') {
  route_serve_styled_asset($parts);
  exit;
}
if (($parts[1] ?? '') === 'auth') {
  handle_auth($parts[2] ?? '', $method);
  exit;
}
if (($parts[1] ?? '') === 'admin') {
  handle_admin($parts, $method);
  exit;
}
if (($parts[1] ?? '') === 'custom-furniture') {
  handle_custom_furniture($parts, $method);
  exit;
}
if (($parts[1] ?? '') === 'projects') {
  handle_projects($method, $parts[2] ?? null);
  exit;
}

not_found();
