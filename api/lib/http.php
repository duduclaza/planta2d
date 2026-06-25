<?php
function json_response($data, int $status = 200): void {
  http_response_code($status);
  header('content-type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}
function not_found(): void { json_response(['error' => 'Not found'], 404); }
function bad_request(string $message): void { json_response(['error' => $message], 400); }
function unauthorized(string $message = 'Login required'): void { json_response(['error' => $message], 401); }
function forbidden(string $message = 'Acesso negado'): void { json_response(['error' => $message], 403); }
function server_error(string $message): void { json_response(['error' => $message], 500); }

function read_json(): ?array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return null;
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

function bearer_token(): string {
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (stripos($header, 'bearer ') === 0) return trim(substr($header, 7));
  return '';
}
