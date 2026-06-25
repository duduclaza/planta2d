<?php
function route_admin_list_users(): void {
  $stmt = db()->query(
    'SELECT u.id, u.email, u.name, u.email_verified_at, u.created_at,
            COALESCE(p.project_count, 0) AS project_count
     FROM users u
     LEFT JOIN (SELECT user_id, COUNT(*) AS project_count FROM projects GROUP BY user_id) p ON p.user_id = u.id
     ORDER BY u.created_at DESC'
  );
  $rows = $stmt->fetchAll();
  $superAdminEmail = app_config()['super_admin_email'];
  $users = array_map(function ($u) use ($superAdminEmail) {
    $u['is_super_admin'] = normalize_email($u['email']) === $superAdminEmail;
    return $u;
  }, $rows);
  json_response(['users' => $users]);
}

function route_admin_list_styled_assets(): void {
  $stmt = db()->query(
    'SELECT id, folder, filename, furniture_kind, label, width, height, size_bytes, created_at, updated_at
     FROM styled_furniture_assets ORDER BY updated_at DESC'
  );
  json_response(['assets' => $stmt->fetchAll()]);
}

function route_admin_upload_styled_asset(array $admin): void {
  $body = read_json();
  if (!$body) bad_request('Dados do PNG invalidos');

  $folder = sanitize_part((string) ($body['folder'] ?? ''), 'geral') ?: 'geral';
  $kind = sanitize_part((string) ($body['kind'] ?? ''));
  if (!$kind) bad_request('Escolha o movel');

  $filename = sanitize_part((string) ($body['filename'] ?? $kind));
  if (!$filename) bad_request('Nome do arquivo invalido');
  $filename .= '.png';

  $bytes = decode_png_data_url((string) ($body['data_url'] ?? ''));
  $width = max(1, min(2048, (int) ($body['width'] ?? 0)));
  $height = max(1, min(2048, (int) ($body['height'] ?? 0)));
  $label = substr((string) ($body['label'] ?? ''), 0, 120);
  $now = now_iso();

  save_upload_file('styled-assets/' . $folder, $filename, $bytes);

  $stmt = db()->prepare('SELECT id FROM styled_furniture_assets WHERE folder = ? AND filename = ?');
  $stmt->execute([$folder, $filename]);
  $existing = $stmt->fetch();
  $id = $existing['id'] ?? uuid();

  db()->prepare(
    'INSERT INTO styled_furniture_assets (id, folder, filename, furniture_kind, label, content_type, width, height, size_bytes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, \'image/png\', ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE furniture_kind = VALUES(furniture_kind), label = VALUES(label), width = VALUES(width),
       height = VALUES(height), size_bytes = VALUES(size_bytes), created_by = VALUES(created_by), updated_at = VALUES(updated_at)'
  )->execute([$id, $folder, $filename, $kind, $label, $width, $height, strlen($bytes), $admin['id'], $now, $now]);

  json_response(['ok' => true, 'asset' => [
    'folder' => $folder, 'filename' => $filename, 'furniture_kind' => $kind, 'label' => $label,
    'width' => $width, 'height' => $height, 'size_bytes' => strlen($bytes), 'updated_at' => $now,
  ]]);
}

function route_admin_delete_styled_asset(string $id): void {
  $stmt = db()->prepare('SELECT folder, filename FROM styled_furniture_assets WHERE id = ?');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if ($row) delete_upload_file('styled-assets/' . $row['folder'], $row['filename']);
  db()->prepare('DELETE FROM styled_furniture_assets WHERE id = ?')->execute([$id]);
  json_response(['ok' => true]);
}

function handle_admin(array $parts, string $method) {
  $admin = require_admin();
  $resource = $parts[2] ?? null;
  $id = $parts[3] ?? null;

  if ($resource === 'users' && !$id && $method === 'GET') return route_admin_list_users();
  if ($resource === 'styled-assets' && !$id && $method === 'GET') return route_admin_list_styled_assets();
  if ($resource === 'styled-assets' && !$id && $method === 'POST') return route_admin_upload_styled_asset($admin);
  if ($resource === 'styled-assets' && $id && $method === 'DELETE') return route_admin_delete_styled_asset($id);

  not_found();
}
