<?php
const SESSION_DAYS = 30;

function normalize_email(string $email): string {
  return strtolower(trim($email));
}
function is_email(string $email): bool {
  return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}
function random_token(int $bytes = 32): string {
  return bin2hex(random_bytes($bytes));
}
function random_code(): string {
  return (string) random_int(100000, 999999);
}
function sha256_hex(string $value): string {
  return hash('sha256', $value);
}
function is_super_admin(array $user): bool {
  return normalize_email($user['email'] ?? '') === app_config()['super_admin_email'];
}
function public_user(array $user): array {
  return [
    'id' => $user['id'],
    'email' => $user['email'],
    'name' => $user['name'],
    'email_verified_at' => $user['email_verified_at'],
    'is_super_admin' => is_super_admin($user),
  ];
}

function create_session(string $userId): array {
  $token = random_token(32);
  $tokenHash = sha256_hex($token);
  $expiresAt = iso_plus_days(SESSION_DAYS);
  db()->prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    ->execute([uuid(), $userId, $tokenHash, $expiresAt, now_iso()]);
  return ['token' => $token, 'expires_at' => $expiresAt];
}

function current_user(): ?array {
  $token = bearer_token();
  if (!$token) return null;
  $tokenHash = sha256_hex($token);
  $stmt = db()->prepare(
    'SELECT u.id, u.email, u.name, u.email_verified_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?'
  );
  $stmt->execute([$tokenHash, now_iso()]);
  $row = $stmt->fetch();
  return $row ?: null;
}

function require_user(): array {
  $user = current_user();
  if (!$user) unauthorized();
  return $user;
}

function require_admin(): array {
  $user = require_user();
  if (!is_super_admin($user)) forbidden('Apenas o Super Admin pode acessar esta area');
  return $user;
}
