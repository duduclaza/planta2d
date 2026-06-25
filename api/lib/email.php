<?php
function send_email(string $to, string $subject, string $html): void {
  $cfg = app_config();
  $apiKey = $cfg['resend_api_key'] ?? '';
  if (!$apiKey) {
    error_log('RESEND_API_KEY nao configurada; email nao enviado.');
    return;
  }
  $from = $cfg['resend_from_email'] ?? 'Planta Baixa <onboarding@resend.dev>';
  $ch = curl_init('https://api.resend.com/emails');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      'authorization: Bearer ' . $apiKey,
      'content-type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode(['from' => $from, 'to' => $to, 'subject' => $subject, 'html' => $html]),
    CURLOPT_TIMEOUT => 15,
  ]);
  $response = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($status < 200 || $status >= 300) {
    error_log('Resend email failed: ' . $status . ' ' . $response);
    throw new RuntimeException('Nao foi possivel enviar o email. Verifique o remetente configurado no Resend.');
  }
}
