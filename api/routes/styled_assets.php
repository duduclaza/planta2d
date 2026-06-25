<?php
function route_serve_styled_asset(array $parts): void {
  $folder = sanitize_part($parts[2] ?? '');
  $filename = preg_replace('/[^a-z0-9_.-]/i', '', $parts[3] ?? '');
  $filename = substr($filename ?? '', 0, 90);
  if (!$folder || !$filename) not_found();

  $stmt = db()->prepare('SELECT content_type FROM styled_furniture_assets WHERE folder = ? AND filename = ?');
  $stmt->execute([$folder, $filename]);
  $row = $stmt->fetch();
  if (!$row) not_found();

  serve_upload_file('styled-assets/' . $folder, $filename, $row['content_type']);
}
