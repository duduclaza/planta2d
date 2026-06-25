<?php
function custom_furniture_item_json(array $row): array {
  return [
    'kind' => $row['kind'],
    'label' => $row['label'],
    'w' => (float) $row['w'],
    'h' => (float) $row['h'],
    'category' => $row['category'],
    'image_url' => '/api/custom-furniture/' . rawurlencode($row['kind']) . '/image',
    'updated_at' => $row['updated_at'],
  ];
}

function route_list_custom_furniture(array $user): void {
  $stmt = db()->prepare('SELECT * FROM custom_furniture_items WHERE user_id = ? ORDER BY updated_at DESC');
  $stmt->execute([$user['id']]);
  $items = array_map('custom_furniture_item_json', $stmt->fetchAll());
  json_response(['items' => $items]);
}

function route_create_custom_furniture(array $user): void {
  $body = read_json();
  if (!$body) bad_request('Dados invalidos');

  $label = substr(trim((string) ($body['label'] ?? '')), 0, 120) ?: 'Meu movel';
  $w = max(0.05, (float) ($body['w'] ?? 0.6));
  $h = max(0.05, (float) ($body['h'] ?? 0.6));
  $category = substr(trim((string) ($body['category'] ?? '')), 0, 120) ?: 'Minha biblioteca';
  $bytes = decode_png_data_url((string) ($body['data_url'] ?? ''));

  $kind = 'custom_' . bin2hex(random_bytes(8));
  $now = now_iso();

  save_upload_file('custom-furniture/' . $user['id'], $kind . '.png', $bytes);
  db()->prepare(
    'INSERT INTO custom_furniture_items (kind, user_id, label, w, h, category, content_type, size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, \'image/png\', ?, ?, ?)'
  )->execute([$kind, $user['id'], $label, $w, $h, $category, strlen($bytes), $now, $now]);

  $stmt = db()->prepare('SELECT * FROM custom_furniture_items WHERE kind = ?');
  $stmt->execute([$kind]);
  json_response(['ok' => true, 'item' => custom_furniture_item_json($stmt->fetch())]);
}

function find_owned_custom_item(array $user, string $kind): array {
  $stmt = db()->prepare('SELECT * FROM custom_furniture_items WHERE kind = ? AND user_id = ?');
  $stmt->execute([$kind, $user['id']]);
  $item = $stmt->fetch();
  if (!$item) not_found();
  return $item;
}

function route_update_custom_furniture(array $user, string $kind): void {
  find_owned_custom_item($user, $kind);
  $body = read_json();
  $label = substr(trim((string) ($body['label'] ?? '')), 0, 120);
  $w = isset($body['w']) ? max(0.05, (float) $body['w']) : null;
  $h = isset($body['h']) ? max(0.05, (float) $body['h']) : null;
  $category = substr(trim((string) ($body['category'] ?? '')), 0, 120);
  $now = now_iso();

  db()->prepare(
    'UPDATE custom_furniture_items SET
       label = COALESCE(?, label), w = COALESCE(?, w), h = COALESCE(?, h),
       category = COALESCE(?, category), updated_at = ?
     WHERE kind = ? AND user_id = ?'
  )->execute([$label ?: null, $w, $h, $category ?: null, $now, $kind, $user['id']]);

  $stmt = db()->prepare('SELECT * FROM custom_furniture_items WHERE kind = ?');
  $stmt->execute([$kind]);
  json_response(['ok' => true, 'item' => custom_furniture_item_json($stmt->fetch())]);
}

function route_delete_custom_furniture(array $user, string $kind): void {
  find_owned_custom_item($user, $kind);
  delete_upload_file('custom-furniture/' . $user['id'], $kind . '.png');
  db()->prepare('DELETE FROM custom_furniture_items WHERE kind = ? AND user_id = ?')->execute([$kind, $user['id']]);
  json_response(['ok' => true]);
}

function route_serve_custom_furniture_image(array $user, string $kind): void {
  $item = find_owned_custom_item($user, $kind);
  serve_upload_file('custom-furniture/' . $user['id'], $kind . '.png', $item['content_type']);
}

function handle_custom_furniture(array $parts, string $method) {
  $user = require_user();
  $kind = $parts[2] ?? null;
  $sub = $parts[3] ?? null;

  if (!$kind && $method === 'GET') return route_list_custom_furniture($user);
  if (!$kind && $method === 'POST') return route_create_custom_furniture($user);
  if ($kind && !$sub && $method === 'PATCH') return route_update_custom_furniture($user, $kind);
  if ($kind && !$sub && $method === 'DELETE') return route_delete_custom_furniture($user, $kind);
  if ($kind && $sub === 'image' && $method === 'GET') return route_serve_custom_furniture_image($user, $kind);

  not_found();
}
