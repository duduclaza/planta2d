<?php
function route_list_projects(array $user): void {
  $stmt = db()->prepare('SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC');
  $stmt->execute([$user['id']]);
  json_response(['projects' => $stmt->fetchAll()]);
}

function route_get_project(array $user, string $id): void {
  $stmt = db()->prepare('SELECT id, name, data, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $user['id']]);
  $project = $stmt->fetch();
  if (!$project) not_found();
  $project['data'] = json_decode($project['data'], true);
  json_response($project);
}

function route_save_project(array $user, ?string $id): void {
  $body = read_json();
  if (!$body || !isset($body['data'])) bad_request('Project data is required');

  $projectId = $id ?: uuid();
  $name = substr((string) ($body['name'] ?? $body['data']['name'] ?? 'Projeto sem titulo'), 0, 120);
  $data = json_encode($body['data']);
  $now = now_iso();

  if ($id) {
    $stmt = db()->prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);
    if (!$stmt->fetch()) not_found();
  }

  db()->prepare(
    'INSERT INTO projects (id, user_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), data = VALUES(data), updated_at = VALUES(updated_at)'
  )->execute([$projectId, $user['id'], $name, $data, $now, $now]);

  json_response(['id' => $projectId, 'name' => $name, 'updated_at' => $now]);
}

function route_rename_project(array $user, string $id): void {
  $body = read_json();
  $name = trim((string) ($body['name'] ?? ''));
  if (!$name) bad_request('Nome e obrigatorio');
  $name = substr($name, 0, 120);

  $stmt = db()->prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $user['id']]);
  if (!$stmt->fetch()) not_found();

  $now = now_iso();
  db()->prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?')->execute([$name, $now, $id, $user['id']]);
  json_response(['id' => $id, 'name' => $name, 'updated_at' => $now]);
}

function route_delete_project(array $user, string $id): void {
  db()->prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);
  json_response(['ok' => true]);
}

function handle_projects(string $method, ?string $id) {
  $user = require_user();
  if (!$id && $method === 'GET') return route_list_projects($user);
  if (!$id && $method === 'POST') return route_save_project($user, null);
  if ($id && $method === 'GET') return route_get_project($user, $id);
  if ($id && $method === 'PUT') return route_save_project($user, $id);
  if ($id && $method === 'PATCH') return route_rename_project($user, $id);
  if ($id && $method === 'DELETE') return route_delete_project($user, $id);
  json_response(['error' => 'Method not allowed'], 405);
}
