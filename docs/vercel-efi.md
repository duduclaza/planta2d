# Backend Efi na Vercel

Este backend serverless faz apenas a parte Pix/mTLS da Efi.

## Variaveis na Vercel

Configure no projeto Vercel:

```text
EFI_CLIENT_ID
EFI_CLIENT_SECRET
EFI_PIX_KEY
EFI_BACKEND_TOKEN
EFI_CERT_PEM_B64
EFI_KEY_PEM_B64
```

Opcional:

```text
EFI_ENV=production
```

## Gerar os valores base64 dos certificados

No PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("efi-cert.pem"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("efi-key.pem"))
```

Cole cada resultado na Vercel como `EFI_CERT_PEM_B64` e `EFI_KEY_PEM_B64`.

## Worker Cloudflare

Depois do deploy da Vercel, configure no Worker:

```powershell
npx.cmd wrangler secret put EFI_BACKEND_URL
npx.cmd wrangler secret put EFI_BACKEND_TOKEN
```

`EFI_BACKEND_URL` deve ser a URL do projeto Vercel, por exemplo:

```text
https://seu-projeto.vercel.app
```

`EFI_BACKEND_TOKEN` deve ser o mesmo valor configurado na Vercel.

## Teste

Com a Vercel publicada:

```powershell
Invoke-WebRequest -UseBasicParsing https://seu-projeto.vercel.app/api/efi/health -Headers @{"x-efi-backend-token"="SEU_TOKEN"}
```
