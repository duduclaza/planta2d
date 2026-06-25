<?php
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB, mesmo limite do front-end

function sanitize_part(string $value, string $fallback = ''): string {
  $value = $value !== '' ? $value : $fallback;
  $value = strtolower($value);
  $value = preg_replace('/[^a-z0-9_-]+/', '', $value) ?? '';
  return substr($value, 0, 80);
}

function decode_png_data_url(string $dataUrl): string {
  if (!preg_match('/^data:image\/png;base64,([A-Za-z0-9+\/=]+)$/', $dataUrl, $m)) {
    bad_request('Envie uma imagem PNG valida (data URL).');
  }
  $bytes = base64_decode($m[1], true);
  if ($bytes === false) bad_request('Imagem invalida.');
  if (strlen($bytes) > MAX_UPLOAD_BYTES) bad_request('Imagem maior que 5MB. Reduza o tamanho do arquivo.');
  return $bytes;
}

function uploads_dir(): string {
  $dir = app_config()['uploads_dir'];
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  return $dir;
}

function save_upload_file(string $subdir, string $filename, string $bytes): string {
  $dir = uploads_dir() . '/' . $subdir;
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  $path = $dir . '/' . $filename;
  file_put_contents($path, $bytes);
  return $path;
}

function delete_upload_file(string $subdir, string $filename): void {
  $path = uploads_dir() . '/' . $subdir . '/' . $filename;
  if (is_file($path)) unlink($path);
}

function serve_upload_file(string $subdir, string $filename, string $contentType = 'image/png'): void {
  $path = uploads_dir() . '/' . $subdir . '/' . $filename;
  if (!is_file($path)) not_found();
  header('content-type: ' . $contentType);
  header('cache-control: public, max-age=60');
  header('content-length: ' . filesize($path));
  readfile($path);
  exit;
}
