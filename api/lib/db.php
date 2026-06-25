<?php
function app_config(): array {
  static $config = null;
  if ($config === null) {
    $path = __DIR__ . '/../config.php';
    if (!file_exists($path)) {
      json_response(['error' => 'api/config.php nao encontrado. Copie config.sample.php e preencha.'], 500);
    }
    $config = require $path;
  }
  return $config;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $cfg = app_config()['db'];
    $dsn = "mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
  }
  return $pdo;
}

function uuid(): string {
  $data = random_bytes(16);
  $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
  $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function now_iso(): string {
  return (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
}

function iso_plus_minutes(int $minutes): string {
  $dt = new DateTime('now', new DateTimeZone('UTC'));
  $dt->modify("+{$minutes} minutes");
  return $dt->format('Y-m-d H:i:s');
}

function iso_plus_days(int $days): string {
  $dt = new DateTime('now', new DateTimeZone('UTC'));
  $dt->modify("+{$days} days");
  return $dt->format('Y-m-d H:i:s');
}
