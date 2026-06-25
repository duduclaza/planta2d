<?php
// Copie este arquivo para config.php (fora do git) e preencha com as credenciais reais.
return [
  'db' => [
    'host' => 'localhost',
    'name' => 'planer2d',
    'user' => 'planer2d_user',
    'pass' => 'troque-esta-senha',
  ],
  'resend_api_key' => '',
  'resend_from_email' => 'Planta Baixa <onboarding@resend.dev>',
  'super_admin_email' => 'du.claza@gmail.com',
  // Pasta onde os PNGs ficam salvos. De preferencia fora de public_html (um nivel acima).
  'uploads_dir' => __DIR__ . '/../../uploads',
];
