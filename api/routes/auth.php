<?php
const CODE_MINUTES = 15;
const RESET_MINUTES = 15;

function send_verification_code(array $user): void {
  $code = random_code();
  db()->prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'verify'")->execute([$user['id']]);
  db()->prepare("INSERT INTO email_codes (id, user_id, code_hash, purpose, expires_at, created_at) VALUES (?, ?, ?, 'verify', ?, ?)")
    ->execute([uuid(), $user['id'], sha256_hex($code), iso_plus_minutes(CODE_MINUTES), now_iso()]);
  send_email($user['email'], 'Confirme seu cadastro',
    "<p>Seu codigo de confirmacao do Planta Baixa e:</p><h2>{$code}</h2><p>Ele expira em " . CODE_MINUTES . " minutos.</p>");
}

function route_register(): void {
  $body = read_json();
  $email = normalize_email($body['email'] ?? '');
  $name = substr(trim($body['name'] ?? ''), 0, 80);
  $password = (string) ($body['password'] ?? '');

  if (!is_email($email)) bad_request('Email invalido');
  if (strlen($password) < 8) bad_request('A senha precisa ter pelo menos 8 caracteres');

  $existing = db()->prepare('SELECT id FROM users WHERE email = ?');
  $existing->execute([$email]);
  if ($existing->fetch()) bad_request('Este email ja esta cadastrado');

  $user = [
    'id' => uuid(),
    'email' => $email,
    'name' => $name ?: explode('@', $email)[0],
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
  ];
  $now = now_iso();
  db()->prepare('INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([$user['id'], $user['email'], $user['name'], $user['password_hash'], $now, $now]);
  send_verification_code($user);

  json_response(['ok' => true, 'message' => 'Cadastro criado. Confira o codigo enviado para seu email.']);
}

function route_verify(): void {
  $body = read_json();
  $email = normalize_email($body['email'] ?? '');
  $codeHash = sha256_hex(trim($body['code'] ?? ''));

  $stmt = db()->prepare('SELECT id, email, name, email_verified_at FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $user = $stmt->fetch();
  if (!$user) bad_request('Codigo invalido');

  $stmt = db()->prepare("SELECT id FROM email_codes WHERE user_id = ? AND purpose = 'verify' AND code_hash = ? AND expires_at > ?");
  $stmt->execute([$user['id'], $codeHash, now_iso()]);
  if (!$stmt->fetch()) bad_request('Codigo invalido ou expirado');

  $now = now_iso();
  db()->prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?')->execute([$now, $now, $user['id']]);
  db()->prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'verify'")->execute([$user['id']]);
  $session = create_session($user['id']);
  $user['email_verified_at'] = $now;

  json_response(['user' => public_user($user), 'token' => $session['token']]);
}

function route_resend_verification(): void {
  $body = read_json();
  $email = normalize_email($body['email'] ?? '');
  $stmt = db()->prepare('SELECT id, email, name, email_verified_at FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $user = $stmt->fetch();
  if ($user && !$user['email_verified_at']) send_verification_code($user);
  json_response(['ok' => true]);
}

function route_login(): void {
  $body = read_json();
  $email = normalize_email($body['email'] ?? '');
  $password = (string) ($body['password'] ?? '');

  $stmt = db()->prepare('SELECT id, email, name, password_hash, email_verified_at FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $user = $stmt->fetch();
  if (!$user || !password_verify($password, $user['password_hash'])) unauthorized('Email ou senha invalidos');
  if (!$user['email_verified_at']) json_response(['error' => 'Confirme seu email antes de entrar', 'needs_verification' => true], 403);

  $session = create_session($user['id']);
  json_response(['user' => public_user($user), 'token' => $session['token']]);
}

function route_logout(): void {
  $token = bearer_token();
  if ($token) db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([sha256_hex($token)]);
  json_response(['ok' => true]);
}

function route_forgot_password(): void {
  $body = read_json();
  $email = normalize_email($body['email'] ?? '');
  $stmt = db()->prepare('SELECT id, email FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $user = $stmt->fetch();

  if ($user) {
    $code = random_code();
    db()->prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'reset'")->execute([$user['id']]);
    db()->prepare("INSERT INTO email_codes (id, user_id, code_hash, purpose, expires_at, created_at) VALUES (?, ?, ?, 'reset', ?, ?)")
      ->execute([uuid(), $user['id'], sha256_hex($code), iso_plus_minutes(RESET_MINUTES), now_iso()]);
    send_email($user['email'], 'Codigo para redefinir sua senha',
      "<p>Use este codigo para criar uma nova senha:</p><h2>{$code}</h2><p>Ele expira em " . RESET_MINUTES . " minutos.</p>");
  }

  json_response(['ok' => true, 'message' => 'Se o email existir, enviaremos um codigo de recuperacao.']);
}

function route_reset_password(): void {
  $body = read_json();
  $email = normalize_email($body['email'] ?? '');
  $codeHash = sha256_hex(trim($body['code'] ?? ''));
  $password = (string) ($body['password'] ?? '');
  if (strlen($password) < 8) bad_request('A senha precisa ter pelo menos 8 caracteres');

  $stmt = db()->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $user = $stmt->fetch();
  if (!$user) bad_request('Codigo invalido');

  $stmt = db()->prepare("SELECT id FROM email_codes WHERE user_id = ? AND purpose = 'reset' AND code_hash = ? AND expires_at > ?");
  $stmt->execute([$user['id'], $codeHash, now_iso()]);
  if (!$stmt->fetch()) bad_request('Codigo invalido ou expirado');

  $now = now_iso();
  db()->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    ->execute([password_hash($password, PASSWORD_DEFAULT), $now, $user['id']]);
  db()->prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'reset'")->execute([$user['id']]);
  db()->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$user['id']]);
  json_response(['ok' => true]);
}

function route_me(): void {
  $user = require_user();
  json_response(['user' => public_user($user)]);
}

function handle_auth(string $action, string $method) {
  if ($action === 'register' && $method === 'POST') return route_register();
  if ($action === 'verify' && $method === 'POST') return route_verify();
  if ($action === 'resend-verification' && $method === 'POST') return route_resend_verification();
  if ($action === 'login' && $method === 'POST') return route_login();
  if ($action === 'logout' && $method === 'POST') return route_logout();
  if ($action === 'forgot-password' && $method === 'POST') return route_forgot_password();
  if ($action === 'reset-password' && $method === 'POST') return route_reset_password();
  if ($action === 'me' && $method === 'GET') return route_me();
  not_found();
}
