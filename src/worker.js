"use strict";

const SESSION_DAYS = 30;
const CODE_MINUTES = 15;
const RESET_MINUTES = 15;
const PNG_EXPORT_PRICE_CENTS = 199;
const SUPER_ADMIN_EMAIL = "du.claza@gmail.com";
const ACTIVE_PAYMENT_PROVIDER = "efi";
const STYLED_ASSET_MAX_BYTES = 950_000;
const PAYMENT_POLLABLE_STATUSES = new Set(["WAITING", "PENDING", "IN_ANALYSIS"]);
const PAYMENT_PAID_STATUSES = new Set(["PAID"]);

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });

function notFound() {
  return json({ error: "Not found" }, { status: 404 });
}

function badRequest(message) {
  return json({ error: message }, { status: 400 });
}

function unauthorized(message = "Login required") {
  return json({ error: message }, { status: 401 });
}

function serverError(message) {
  return json({ error: message }, { status: 500 });
}

function badGateway(message) {
  return json({ error: message }, { status: 502 });
}

function forbidden(message = "Acesso negado") {
  return json({ error: message }, { status: 403 });
}

function sanitizeAssetPart(value, fallback = "") {
  return String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 80);
}

function base64Bytes(value) {
  return Math.floor(String(value || "").length * 3 / 4);
}

function base64ToBytes(value) {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const encoder = new TextEncoder();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isSuperAdmin = (user) => normalizeEmail(user && user.email) === SUPER_ADMIN_EMAIL;
const addMinutes = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();
const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
const addHours = (hours) => new Date(Date.now() + hours * 60 * 60_000).toISOString();

function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  const hash = [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hash}`;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    email_verified_at: user.email_verified_at,
    is_super_admin: isSuperAdmin(user),
    can_export_free: isSuperAdmin(user) || Number(user.free_png_export || 0) === 1,
  };
}

async function verifyPassword(password, stored) {
  const [salt] = String(stored || "").split(":");
  if (!salt) return false;
  return (await hashPassword(password, salt)) === stored;
}

async function sendEmail(env, to, subject, html) {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not configured; email skipped.");
    return;
  }

  const from = env.RESEND_FROM_EMAIL || "Planta Baixa <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.warn("Resend email failed", response.status, text);
    throw new Error("Nao foi possivel enviar o email. Verifique o remetente configurado no Resend.");
  }
}

async function createSession(env, userId) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const expiresAt = addDays(SESSION_DAYS);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt, new Date().toISOString()).run();
  return { token, expires_at: expiresAt };
}

async function currentUser(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.email_verified_at, COALESCE(u.free_png_export, 0) AS free_png_export
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(tokenHash, new Date().toISOString()).first();

  return row || null;
}

async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) return { response: unauthorized() };
  return { user };
}

async function sendVerificationCode(env, user) {
  const code = randomCode();
  await env.DB.prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'verify'").bind(user.id).run();
  await env.DB.prepare(
    "INSERT INTO email_codes (id, user_id, code_hash, purpose, expires_at, created_at) VALUES (?, ?, ?, 'verify', ?, ?)"
  ).bind(crypto.randomUUID(), user.id, await sha256(code), addMinutes(CODE_MINUTES), new Date().toISOString()).run();

  await sendEmail(
    env,
    user.email,
    "Confirme seu cadastro",
    `<p>Seu codigo de confirmacao do Planta Baixa e:</p><h2>${code}</h2><p>Ele expira em ${CODE_MINUTES} minutos.</p>`
  );
}

async function register(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const name = String((body && body.name) || "").trim().slice(0, 80);
  const password = String((body && body.password) || "");

  if (!isEmail(email)) return badRequest("Email invalido");
  if (password.length < 8) return badRequest("A senha precisa ter pelo menos 8 caracteres");

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return badRequest("Este email ja esta cadastrado");

  const user = {
    id: crypto.randomUUID(),
    email,
    name: name || email.split("@")[0],
    password_hash: await hashPassword(password),
  };
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(user.id, user.email, user.name, user.password_hash, now, now).run();
  await sendVerificationCode(env, user);

  return json({ ok: true, message: "Cadastro criado. Confira o codigo enviado para seu email." });
}

async function verifyEmail(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const codeHash = await sha256(String((body && body.code) || "").trim());
  const user = await env.DB.prepare("SELECT id, email, name, email_verified_at, COALESCE(free_png_export, 0) AS free_png_export FROM users WHERE email = ?").bind(email).first();
  if (!user) return badRequest("Codigo invalido");

  const code = await env.DB.prepare(
    "SELECT id FROM email_codes WHERE user_id = ? AND purpose = 'verify' AND code_hash = ? AND expires_at > ?"
  ).bind(user.id, codeHash, new Date().toISOString()).first();
  if (!code) return badRequest("Codigo invalido ou expirado");

  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?").bind(now, now, user.id).run();
  await env.DB.prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'verify'").bind(user.id).run();
  const session = await createSession(env, user.id);

  return json({ user: publicUser({ ...user, email_verified_at: now }), token: session.token });
}

async function resendVerification(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const user = await env.DB.prepare("SELECT id, email, name, email_verified_at FROM users WHERE email = ?").bind(email).first();
  if (user && !user.email_verified_at) await sendVerificationCode(env, user);
  return json({ ok: true });
}

async function login(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const password = String((body && body.password) || "");
  const user = await env.DB.prepare("SELECT id, email, name, password_hash, email_verified_at, COALESCE(free_png_export, 0) AS free_png_export FROM users WHERE email = ?").bind(email).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) return unauthorized("Email ou senha invalidos");
  if (!user.email_verified_at) return json({ error: "Confirme seu email antes de entrar", needs_verification: true }, { status: 403 });

  const session = await createSession(env, user.id);
  return json({ user: publicUser(user), token: session.token });
}

async function logout(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true });
}

async function forgotPassword(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first();

  if (user) {
    const code = randomCode();
    await env.DB.prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'reset'").bind(user.id).run();
    await env.DB.prepare(
      "INSERT INTO email_codes (id, user_id, code_hash, purpose, expires_at, created_at) VALUES (?, ?, ?, 'reset', ?, ?)"
    ).bind(crypto.randomUUID(), user.id, await sha256(code), addMinutes(RESET_MINUTES), new Date().toISOString()).run();
    await sendEmail(
      env,
      user.email,
      "Codigo para redefinir sua senha",
      `<p>Use este codigo para criar uma nova senha:</p><h2>${code}</h2><p>Ele expira em ${RESET_MINUTES} minutos.</p>`
    );
  }

  return json({ ok: true, message: "Se o email existir, enviaremos um codigo de recuperacao." });
}

async function resetPassword(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body && body.email);
  const codeHash = await sha256(String((body && body.code) || "").trim());
  const password = String((body && body.password) || "");
  if (password.length < 8) return badRequest("A senha precisa ter pelo menos 8 caracteres");

  const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (!user) return badRequest("Codigo invalido");

  const code = await env.DB.prepare(
    "SELECT id FROM email_codes WHERE user_id = ? AND purpose = 'reset' AND code_hash = ? AND expires_at > ?"
  ).bind(user.id, codeHash, new Date().toISOString()).first();
  if (!code) return badRequest("Codigo invalido ou expirado");

  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(await hashPassword(password), now, user.id).run();
  await env.DB.prepare("DELETE FROM email_codes WHERE user_id = ? AND purpose = 'reset'").bind(user.id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  return json({ ok: true });
}

async function me(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  return json({ user: publicUser(auth.user) });
}

async function listProjects(env, userId) {
  const result = await env.DB.prepare(
    "SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC"
  ).bind(userId).all();
  return json({ projects: result.results || [] });
}

async function getProject(env, userId, id) {
  const project = await env.DB.prepare(
    "SELECT id, name, data, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?"
  ).bind(id, userId).first();

  if (!project) return notFound();
  return json({ ...project, data: JSON.parse(project.data) });
}

async function saveProject(request, env, userId, id) {
  const body = await readJson(request);
  if (!body || !body.data) return badRequest("Project data is required");

  const projectId = id || crypto.randomUUID();
  const name = String(body.name || body.data.name || "Projeto sem titulo").slice(0, 120);
  const data = JSON.stringify(body.data);
  const now = new Date().toISOString();

  if (id) {
    const existing = await env.DB.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").bind(id, userId).first();
    if (!existing) return notFound();
  }

  await env.DB.prepare(
    `INSERT INTO projects (id, user_id, name, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       data = excluded.data,
       updated_at = excluded.updated_at`
  ).bind(projectId, userId, name, data, now, now).run();

  return json({ id: projectId, name, updated_at: now });
}

async function renameProject(request, env, userId, id) {
  const body = await readJson(request);
  const name = String((body && body.name) || "").trim().slice(0, 120);
  if (!name) return badRequest("Nome e obrigatorio");

  const existing = await env.DB.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").bind(id, userId).first();
  if (!existing) return notFound();

  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(name, now, id, userId).run();
  return json({ id, name, updated_at: now });
}

async function deleteProject(env, userId, id) {
  await env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return json({ ok: true });
}

async function requireAdmin(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth;
  if (!isSuperAdmin(auth.user)) return { response: forbidden("Apenas o Super Admin pode acessar esta area") };
  return auth;
}

async function listAdminUsers(env) {
  const result = await env.DB.prepare(
    `SELECT
       u.id,
       u.email,
       u.name,
       u.email_verified_at,
       u.created_at,
       COALESCE(u.free_png_export, 0) AS free_png_export,
       COALESCE(projects.project_count, 0) AS project_count,
       COALESCE(payments.spent_cents, 0) AS spent_cents,
       COALESCE(payments.paid_exports, 0) AS paid_exports
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) AS project_count
       FROM projects
       GROUP BY user_id
     ) projects ON projects.user_id = u.id
     LEFT JOIN (
       SELECT user_id, SUM(amount_cents) AS spent_cents, COUNT(*) AS paid_exports
       FROM payment_exports
       WHERE status = 'PAID'
       GROUP BY user_id
     ) payments ON payments.user_id = u.id
     ORDER BY u.created_at DESC`
  ).all();

  return json({
    users: (result.results || []).map((user) => ({
      ...user,
      free_png_export: Number(user.free_png_export || 0) === 1,
      is_super_admin: normalizeEmail(user.email) === SUPER_ADMIN_EMAIL,
    })),
  });
}

async function updateAdminUser(request, env, id) {
  const body = await readJson(request);
  const freePngExport = body && body.free_png_export ? 1 : 0;
  const existing = await env.DB.prepare("SELECT id, email FROM users WHERE id = ?").bind(id).first();
  if (!existing) return notFound();

  await env.DB.prepare("UPDATE users SET free_png_export = ?, updated_at = ? WHERE id = ?")
    .bind(freePngExport, new Date().toISOString(), id)
    .run();

  return json({ ok: true, id, free_png_export: freePngExport === 1 });
}

async function listStyledAssets(env) {
  const result = await env.DB.prepare(
    `SELECT id, folder, filename, furniture_kind, label, width, height, size_bytes, created_at, updated_at
     FROM styled_furniture_assets
     ORDER BY updated_at DESC`
  ).all();
  return json({ assets: result.results || [] });
}

async function uploadStyledAsset(request, env, user) {
  const body = await readJson(request);
  if (!body) return badRequest("Dados do PNG invalidos");

  const folder = sanitizeAssetPart(body.folder, "geral") || "geral";
  const kind = sanitizeAssetPart(body.kind);
  if (!kind) return badRequest("Escolha o movel");

  let filename = sanitizeAssetPart(body.filename || kind);
  if (!filename.endsWith(".png")) filename += ".png";
  filename = filename.replace(/[^a-z0-9_.-]/g, "").slice(0, 90);
  if (!filename || filename === ".png") return badRequest("Nome do arquivo invalido");

  const match = String(body.data_url || "").match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return badRequest("Envie uma imagem PNG");
  const dataBase64 = match[1];
  const sizeBytes = base64Bytes(dataBase64);
  if (sizeBytes > STYLED_ASSET_MAX_BYTES) return badRequest("PNG muito grande. Reduza a imagem antes de enviar.");

  const width = Math.max(1, Math.min(2048, Number(body.width || 0) || 0));
  const height = Math.max(1, Math.min(2048, Number(body.height || 0) || 0));
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO styled_furniture_assets
      (id, folder, filename, furniture_kind, label, content_type, data_base64, width, height, size_bytes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'image/png', ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(folder, filename) DO UPDATE SET
       furniture_kind = excluded.furniture_kind,
       label = excluded.label,
       content_type = excluded.content_type,
       data_base64 = excluded.data_base64,
       width = excluded.width,
       height = excluded.height,
       size_bytes = excluded.size_bytes,
       created_by = excluded.created_by,
       updated_at = excluded.updated_at`
  ).bind(
    id,
    folder,
    filename,
    kind,
    String(body.label || "").slice(0, 120),
    dataBase64,
    width,
    height,
    sizeBytes,
    user.id,
    now,
    now
  ).run();

  return json({
    ok: true,
    asset: { folder, filename, furniture_kind: kind, label: String(body.label || "").slice(0, 120), width, height, size_bytes: sizeBytes, updated_at: now },
  });
}

async function deleteStyledAsset(env, id) {
  await env.DB.prepare("DELETE FROM styled_furniture_assets WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function checkEfi(env) {
  const configError = ensureEfiConfig(env);
  if (configError) return serverError(configError);
  try {
    const token = await efiAccessToken(env);
    return json({ ok: true, message: "Efi OAuth respondeu com sucesso", token_preview: token ? `${token.slice(0, 8)}...` : "" });
  } catch (err) {
    return badGateway(err && err.message ? err.message : "Nao foi possivel autenticar na Efi");
  }
}

async function handleAdmin(request, env, parts) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  if (parts[2] === "users" && !parts[3] && request.method === "GET") return listAdminUsers(env);
  if (parts[2] === "users" && parts[3] && request.method === "PATCH") return updateAdminUser(request, env, parts[3]);
  if (parts[2] === "styled-assets" && !parts[3] && request.method === "GET") return listStyledAssets(env);
  if (parts[2] === "styled-assets" && !parts[3] && request.method === "POST") return uploadStyledAsset(request, env, auth.user);
  if (parts[2] === "styled-assets" && parts[3] && request.method === "DELETE") return deleteStyledAsset(env, parts[3]);
  if (parts[2] === "efi-check" && request.method === "GET") return checkEfi(env);

  return notFound();
}

function efiFetch(env) {
  return env.EFI_MTLS && typeof env.EFI_MTLS.fetch === "function" ? env.EFI_MTLS.fetch.bind(env.EFI_MTLS) : fetch;
}

function efiBaseUrl(env) {
  return String(env.EFI_ENV || "production").toLowerCase() === "sandbox"
    ? "https://pix-h.api.efipay.com.br"
    : "https://pix.api.efipay.com.br";
}

function ensureEfiConfig(env) {
  if (!env.EFI_CLIENT_ID) return "EFI_CLIENT_ID nao esta configurado no Worker";
  if (!env.EFI_CLIENT_SECRET) return "EFI_CLIENT_SECRET nao esta configurado no Worker";
  if (!env.EFI_PIX_KEY) return "EFI_PIX_KEY nao esta configurado no Worker";
  if (!env.EFI_MTLS) return "Certificado mTLS da Efi nao esta vinculado ao Worker como EFI_MTLS";
  return "";
}

function efiEnv(env, key) {
  return String(env[key] || "").trim();
}

async function efiRequest(env, path, init = {}) {
  const response = await efiFetch(env)(`${efiBaseUrl(env)}${path}`, init);
  const raw = await response.text().catch(() => "");
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }
  if (!response.ok) {
    const detail = data.detalhes || data.detail || data.details || data.errors || data.violacoes || "";
    const message = data.mensagem || data.message || data.erro || data.error_description || data.raw || "Efi recusou a requisicao";
    const suffix = detail ? ` - ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : "";
    console.warn("Efi request failed", response.status, path, raw);
    throw new Error(`Efi HTTP ${response.status} em ${path}: ${message}${suffix}`);
  }
  return data;
}

async function efiAccessToken(env) {
  const basic = btoa(`${efiEnv(env, "EFI_CLIENT_ID")}:${efiEnv(env, "EFI_CLIENT_SECRET")}`);
  const body = JSON.stringify({ grant_type: "client_credentials" });
  const data = await efiRequest(env, "/oauth/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      accept: "application/json",
      "content-type": "application/json",
      "content-length": String(body.length),
    },
    body,
  });
  return data.access_token;
}

function efiTxid() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(26);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => chars[byte % chars.length]).join("");
}

function efiChargeIsPaid(charge) {
  return String(charge.status || "").toUpperCase() === "CONCLUIDA";
}

async function createEfiPngPayment(request, env, user) {
  const configError = ensureEfiConfig(env);
  if (configError) return serverError(configError);

  const body = (await readJson(request)) || {};
  const projectName = String(body.project_name || "Planta baixa").trim().slice(0, 80) || "Planta baixa";
  const id = crypto.randomUUID();
  const txid = efiTxid();

  let charge;
  let qr;
  try {
    const token = await efiAccessToken(env);
    charge = await efiRequest(env, `/v2/cob/${encodeURIComponent(txid)}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        calendario: { expiracao: 3600 },
        valor: { original: (PNG_EXPORT_PRICE_CENTS / 100).toFixed(2) },
        chave: efiEnv(env, "EFI_PIX_KEY"),
        solicitacaoPagador: `Exportacao PNG - ${projectName}`.slice(0, 140),
      }),
    });
    const locId = charge.loc && charge.loc.id;
    if (!locId) throw new Error("Efi criou a cobranca, mas nao retornou loc.id para gerar QR Code");
    qr = await efiRequest(env, `/v2/loc/${encodeURIComponent(locId)}/qrcode`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return badGateway(err && err.message ? err.message : "Nao foi possivel criar a cobranca Pix na Efi");
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO payment_exports
      (id, user_id, reference_id, pagbank_order_id, amount_cents, status, qr_text, qr_png_url, payload,
       expires_at, paid_at, created_at, updated_at, provider, efi_txid, efi_loc_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'efi', ?, ?)`
  ).bind(
    id,
    user.id,
    `efi-${id}`,
    txid,
    PNG_EXPORT_PRICE_CENTS,
    efiChargeIsPaid(charge) ? "PAID" : "WAITING",
    qr.qrcode || null,
    qr.imagemQrcode || null,
    JSON.stringify({ charge, qr }),
    addHours(1),
    efiChargeIsPaid(charge) ? now : null,
    now,
    now,
    txid,
    String((charge.loc && charge.loc.id) || "")
  ).run();

  const row = await env.DB.prepare("SELECT * FROM payment_exports WHERE id = ?").bind(id).first();
  return json(paymentPublicData(row));
}

async function getEfiPaymentStatus(env, row) {
  if (!env.EFI_CLIENT_ID || !env.EFI_CLIENT_SECRET || !env.EFI_MTLS || !row.efi_txid || PAYMENT_PAID_STATUSES.has(String(row.status || "").toUpperCase())) return row;
  try {
    const token = await efiAccessToken(env);
    const charge = await efiRequest(env, `/v2/cob/${encodeURIComponent(row.efi_txid)}`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    const status = efiChargeIsPaid(charge) ? "PAID" : String(charge.status || "WAITING").toUpperCase();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE payment_exports SET status = ?, paid_at = COALESCE(?, paid_at), payload = ?, updated_at = ? WHERE id = ?"
    ).bind(status, status === "PAID" ? now : null, JSON.stringify(charge), now, row.id).run();
    return { ...row, status, paid_at: status === "PAID" ? now : row.paid_at, payload: JSON.stringify(charge), updated_at: now };
  } catch (err) {
    console.warn("Efi status sync failed", err && err.message ? err.message : err);
    return row;
  }
}

async function handleEfiWebhook(request, env) {
  const payload = (await readJson(request)) || {};
  const pix = Array.isArray(payload.pix) ? payload.pix : [];
  const now = new Date().toISOString();
  for (const item of pix) {
    if (!item.txid) continue;
    await env.DB.prepare(
      "UPDATE payment_exports SET status = 'PAID', paid_at = COALESCE(paid_at, ?), payload = ?, updated_at = ? WHERE provider = 'efi' AND efi_txid = ?"
    ).bind(now, JSON.stringify(payload), now, item.txid).run();
  }
  return json({ ok: true });
}

function efiBackendUrl(env, path) {
  const base = String(env.EFI_BACKEND_URL || "").trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : "";
}

async function efiBackendJson(env, path, init = {}) {
  const url = efiBackendUrl(env, path);
  if (!url) throw new Error("EFI_BACKEND_URL nao esta configurado");
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-efi-backend-token": String(env.EFI_BACKEND_TOKEN || "").trim(),
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Backend Efi HTTP ${response.status}`);
  return data;
}

async function createEfiBackendPngPayment(request, env, user) {
  if (!env.EFI_BACKEND_URL) return createEfiPngPayment(request, env, user);
  if (!env.EFI_BACKEND_TOKEN) return serverError("EFI_BACKEND_TOKEN nao esta configurado no Worker");

  const body = (await readJson(request)) || {};
  const id = crypto.randomUUID();
  let payment;
  try {
    payment = await efiBackendJson(env, "/api/efi/create-pix", {
      method: "POST",
      body: JSON.stringify({ project_name: body.project_name || "Planta baixa", user_id: user.id, payment_id: id }),
    });
  } catch (err) {
    return badGateway(err && err.message ? err.message : "Backend Efi nao criou a cobranca Pix");
  }

  const now = new Date().toISOString();
  const paid = !!payment.paid || payment.status === "PAID";
  await env.DB.prepare(
    `INSERT INTO payment_exports
      (id, user_id, reference_id, pagbank_order_id, amount_cents, status, qr_text, qr_png_url, payload,
       expires_at, paid_at, created_at, updated_at, provider, efi_txid, efi_loc_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'efi', ?, ?)`
  ).bind(
    id,
    user.id,
    `efi-${id}`,
    payment.txid,
    Number(payment.amount_cents || PNG_EXPORT_PRICE_CENTS),
    paid ? "PAID" : "WAITING",
    payment.qr_text || null,
    payment.qr_image_url || null,
    JSON.stringify(payment.payload || payment),
    addHours(1),
    paid ? now : null,
    now,
    now,
    payment.txid || null,
    payment.loc_id || null
  ).run();

  const row = await env.DB.prepare("SELECT * FROM payment_exports WHERE id = ?").bind(id).first();
  return json(paymentPublicData(row));
}

async function getEfiBackendPaymentStatus(env, row) {
  if (!env.EFI_BACKEND_URL || !row.efi_txid || PAYMENT_PAID_STATUSES.has(String(row.status || "").toUpperCase())) return getEfiPaymentStatus(env, row);
  try {
    const status = await efiBackendJson(env, `/api/efi/status?txid=${encodeURIComponent(row.efi_txid)}`, { method: "GET" });
    const paid = !!status.paid || status.status === "PAID";
    const nextStatus = paid ? "PAID" : String(status.status || "WAITING").toUpperCase();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE payment_exports SET status = ?, paid_at = COALESCE(?, paid_at), payload = ?, updated_at = ? WHERE id = ?"
    ).bind(nextStatus, paid ? now : null, JSON.stringify(status.payload || status), now, row.id).run();
    return { ...row, status: nextStatus, paid_at: paid ? now : row.paid_at, payload: JSON.stringify(status.payload || status), updated_at: now };
  } catch (err) {
    console.warn("Efi backend status sync failed", err && err.message ? err.message : err);
    return row;
  }
}

function ensureStripeConfig(env) {
  if (!env.STRIPE_SECRET_KEY) return "STRIPE_SECRET_KEY nao esta configurado no Worker";
  return "";
}

async function stripeRequest(env, path, params = null, init = {}) {
  const headers = {
    authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    ...(init.headers || {}),
  };
  let body;
  if (params) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(params);
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: params ? "POST" : "GET",
    ...init,
    headers,
    body,
  });
  const data = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    const message = data.error?.message || data.message || data.raw || "Stripe recusou a requisicao";
    throw new Error(`Stripe HTTP ${response.status}: ${message}`);
  }
  return data;
}

function stripeSessionIsPaid(session) {
  return session && session.payment_status === "paid";
}

async function createStripePngPayment(request, env, user) {
  const configError = ensureStripeConfig(env);
  if (configError) return serverError(configError);

  const body = (await readJson(request)) || {};
  const projectName = String(body.project_name || "Planta baixa").trim().slice(0, 80) || "Planta baixa";
  const id = crypto.randomUUID();
  const origin = new URL(request.url).origin;

  let session;
  const embedded = !!env.STRIPE_PUBLISHABLE_KEY;
  const params = {
    mode: "payment",
    "payment_method_types[0]": "pix",
    customer_email: user.email,
    client_reference_id: id,
    "metadata[payment_export_id]": id,
    "metadata[user_id]": user.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "brl",
    "line_items[0][price_data][unit_amount]": String(PNG_EXPORT_PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": `Exportacao PNG - ${projectName}`.slice(0, 100),
  };
  if (embedded) {
    params.ui_mode = "embedded_page";
    params.return_url = `${origin}/planta-baixa.html?stripe_payment_id=${encodeURIComponent(id)}&stripe_result=return`;
  } else {
    params.success_url = `${origin}/planta-baixa.html?stripe_payment_id=${encodeURIComponent(id)}&stripe_result=success`;
    params.cancel_url = `${origin}/planta-baixa.html?stripe_payment_id=${encodeURIComponent(id)}&stripe_result=cancel`;
  }

  try {
    session = await stripeRequest(env, "/checkout/sessions", params);
  } catch (err) {
    return badGateway(err && err.message ? err.message : "Nao foi possivel criar o pagamento no Stripe");
  }

  const now = new Date().toISOString();
  const status = stripeSessionIsPaid(session) ? "PAID" : "WAITING";
  await env.DB.prepare(
    `INSERT INTO payment_exports
      (id, user_id, reference_id, pagbank_order_id, amount_cents, status, payload, paid_at, created_at, updated_at,
       provider, stripe_session_id, stripe_payment_intent_id, checkout_url, stripe_client_secret)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stripe', ?, ?, ?, ?)`
  ).bind(
    id,
    user.id,
    `stripe-${id}`,
    session.id,
    PNG_EXPORT_PRICE_CENTS,
    status,
    JSON.stringify(session),
    status === "PAID" ? now : null,
    now,
    now,
    session.id,
    session.payment_intent || null,
    session.url || null,
    session.client_secret || null
  ).run();

  const row = await env.DB.prepare("SELECT * FROM payment_exports WHERE id = ?").bind(id).first();
  return json({ ...paymentPublicData(row), stripe_publishable_key: env.STRIPE_PUBLISHABLE_KEY || null });
}

async function savePaymentFromStripeSession(env, row, session) {
  const status = stripeSessionIsPaid(session) ? "PAID" : String(session.payment_status || "WAITING").toUpperCase();
  const paidAt = status === "PAID" ? new Date().toISOString() : null;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE payment_exports
     SET status = ?, paid_at = COALESCE(?, paid_at), payload = ?, updated_at = ?,
         stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id), checkout_url = COALESCE(?, checkout_url)
     WHERE id = ?`
  ).bind(status, paidAt, JSON.stringify(session), now, session.payment_intent || null, session.url || null, row.id).run();
  return { ...row, status, paid_at: paidAt || row.paid_at, payload: JSON.stringify(session), updated_at: now };
}

async function getStripePaymentStatus(env, row) {
  if (!env.STRIPE_SECRET_KEY || !row.stripe_session_id || PAYMENT_PAID_STATUSES.has(String(row.status || "").toUpperCase())) return row;
  try {
    const session = await stripeRequest(env, `/checkout/sessions/${encodeURIComponent(row.stripe_session_id)}`);
    return savePaymentFromStripeSession(env, row, session);
  } catch (err) {
    console.warn("Stripe status sync failed", err && err.message ? err.message : err);
    return row;
  }
}

async function verifyStripeWebhook(env, payload, signatureHeader) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET nao esta configurado");
  const parts = Object.fromEntries(String(signatureHeader || "").split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  if (!parts.t || !parts.v1) throw new Error("Assinatura Stripe ausente");
  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expected = [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (expected !== parts.v1) throw new Error("Assinatura Stripe invalida");
}

async function handleStripeWebhook(request, env) {
  const raw = await request.text();
  try {
    await verifyStripeWebhook(env, raw, request.headers.get("stripe-signature"));
  } catch (err) {
    return unauthorized(err && err.message ? err.message : "Webhook Stripe invalido");
  }

  const event = JSON.parse(raw);
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return json({ ok: true });

  const session = event.data && event.data.object;
  const id = session?.metadata?.payment_export_id || session?.client_reference_id || "";
  const row = await env.DB.prepare("SELECT * FROM payment_exports WHERE id = ? OR stripe_session_id = ?").bind(id, session?.id || "").first();
  if (row) await savePaymentFromStripeSession(env, row, session);
  return json({ ok: true });
}

function pagbankBaseUrl(env) {
  return String(env.PAGBANK_ENV || "production").toLowerCase() === "sandbox"
    ? "https://sandbox.api.pagseguro.com"
    : "https://api.pagseguro.com";
}

function pagbankHeaders(env, extra = {}) {
  return {
    authorization: `Bearer ${env.PAGBANK_TOKEN}`,
    accept: "application/json",
    "content-type": "application/json",
    ...extra,
  };
}

function ensurePagBankConfig(env) {
  if (!env.PAGBANK_TOKEN) return "PAGBANK_TOKEN nao esta configurado no Worker";
  if (!env.PAGBANK_CUSTOMER_TAX_ID) return "PAGBANK_CUSTOMER_TAX_ID nao esta configurado no Worker";
  return "";
}

async function pagbankRequest(env, path, init = {}) {
  const response = await fetch(`${pagbankBaseUrl(env)}${path}`, {
    ...init,
    headers: pagbankHeaders(env, init.headers || {}),
  });
  const data = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    console.warn("PagBank request failed", response.status, data);
    const message = data.error_messages?.[0]?.description || data.message || data.raw || "PagBank recusou a requisicao";
    throw new Error(`PagBank HTTP ${response.status}: ${message}`);
  }
  return data;
}

function orderStatus(order) {
  const paidCharge = (order.charges || []).find((charge) => PAYMENT_PAID_STATUSES.has(String(charge.status || "").toUpperCase()));
  if (paidCharge) return { status: "PAID", paid_at: paidCharge.paid_at || new Date().toISOString() };
  const charge = (order.charges || [])[0];
  return { status: String((charge && charge.status) || "WAITING").toUpperCase(), paid_at: null };
}

function paymentPublicData(row) {
  const provider = row.provider || "pagbank";
  return {
    id: row.id,
    provider,
    order_id: row.pagbank_order_id,
    stripe_session_id: row.stripe_session_id || null,
    stripe_client_secret: row.stripe_client_secret || null,
    amount_cents: row.amount_cents,
    status: row.status,
    paid: PAYMENT_PAID_STATUSES.has(String(row.status || "").toUpperCase()),
    paid_at: row.paid_at,
    expires_at: row.expires_at,
    qr_text: row.qr_text,
    qr_image_url: provider === "pagbank" ? `/api/payments/${encodeURIComponent(row.id)}/qr.png` : row.qr_png_url || null,
    checkout_url: row.checkout_url || null,
  };
}

async function savePaymentFromOrder(env, row, order) {
  const next = orderStatus(order);
  if (String(row.status || "").toUpperCase() === next.status && !next.paid_at) return row;
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE payment_exports SET status = ?, paid_at = COALESCE(?, paid_at), payload = ?, updated_at = ? WHERE id = ?"
  ).bind(next.status, next.paid_at, JSON.stringify(order), now, row.id).run();
  return { ...row, status: next.status, paid_at: next.paid_at || row.paid_at, payload: JSON.stringify(order), updated_at: now };
}

async function createPngPayment(request, env, user) {
  const configError = ensurePagBankConfig(env);
  if (configError) return serverError(configError);

  const body = (await readJson(request)) || {};
  const projectName = String(body.project_name || "Planta baixa").trim().slice(0, 80) || "Planta baixa";
  const id = crypto.randomUUID();
  const referenceId = `png-${id}`;
  const expiresAt = addHours(1);
  const notificationUrl = env.PAGBANK_NOTIFICATION_URL || `${new URL(request.url).origin}/api/payments/pagbank-webhook`;

  let order;
  try {
    order = await pagbankRequest(env, "/orders", {
      method: "POST",
      headers: { "x-idempotency-key": id },
      body: JSON.stringify({
        reference_id: referenceId,
        customer: {
          name: String(user.name || "Cliente Planta Baixa").slice(0, 80),
          email: user.email,
          tax_id: String(env.PAGBANK_CUSTOMER_TAX_ID).replace(/\D/g, ""),
        },
        items: [
          {
            reference_id: "export-png",
            name: `Exportacao PNG - ${projectName}`.slice(0, 100),
            quantity: 1,
            unit_amount: PNG_EXPORT_PRICE_CENTS,
          },
        ],
        qr_codes: [
          {
            amount: { value: PNG_EXPORT_PRICE_CENTS },
            expiration_date: expiresAt,
          },
        ],
        notification_urls: [notificationUrl],
      }),
    });
  } catch (err) {
    return badGateway(err && err.message ? err.message : "Nao foi possivel criar a cobranca no PagBank");
  }

  const qr = (order.qr_codes || order.qr_code || [])[0] || {};
  const qrPng = (qr.links || []).find((link) => link.media === "image/png" || link.rel === "QRCODE.PNG");
  if (!order.id || !qr.text || !qrPng) return badGateway("PagBank criou o pedido, mas nao retornou o QR Code PIX.");
  const now = new Date().toISOString();
  const initialStatus = orderStatus(order);
  await env.DB.prepare(
    `INSERT INTO payment_exports
      (id, user_id, reference_id, pagbank_order_id, pagbank_qr_id, amount_cents, status, qr_text, qr_png_url, payload, expires_at, paid_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    user.id,
    referenceId,
    order.id,
    qr.id || null,
    PNG_EXPORT_PRICE_CENTS,
    initialStatus.status,
    qr.text || null,
    (qrPng && qrPng.href) || null,
    JSON.stringify(order),
    qr.expiration_date || expiresAt,
    initialStatus.paid_at,
    now,
    now
  ).run();

  const row = await env.DB.prepare("SELECT * FROM payment_exports WHERE id = ?").bind(id).first();
  return json(paymentPublicData(row));
}

async function getPaymentRow(env, userId, id) {
  return env.DB.prepare("SELECT * FROM payment_exports WHERE id = ? AND user_id = ?").bind(id, userId).first();
}

async function getPaymentStatus(env, user, id) {
  let row = await getPaymentRow(env, user.id, id);
  if (!row) return notFound();

  if ((row.provider || "pagbank") === "efi") {
    row = await getEfiBackendPaymentStatus(env, row);
    return json(paymentPublicData(row));
  }

  if ((row.provider || "pagbank") === "stripe") {
    row = await getStripePaymentStatus(env, row);
    return json(paymentPublicData(row));
  }

  const status = String(row.status || "").toUpperCase();
  if (env.PAGBANK_TOKEN && row.pagbank_order_id && PAYMENT_POLLABLE_STATUSES.has(status)) {
    try {
      const order = await pagbankRequest(env, `/orders/${encodeURIComponent(row.pagbank_order_id)}`, { method: "GET" });
      row = await savePaymentFromOrder(env, row, order);
    } catch (err) {
      console.warn("PagBank status sync failed", err && err.message ? err.message : err);
    }
  }
  return json(paymentPublicData(row));
}

async function getPaymentQr(env, user, id) {
  const row = await getPaymentRow(env, user.id, id);
  if (!row || !row.qr_png_url) return notFound();
  const response = await fetch(row.qr_png_url, { headers: { authorization: `Bearer ${env.PAGBANK_TOKEN}` } });
  if (!response.ok) return json({ error: "Nao foi possivel carregar o QR Code" }, { status: response.status });
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") || "image/png",
      "cache-control": "no-store",
    },
  });
}

async function handlePagBankWebhook(request, env) {
  const raw = await request.text();
  if (env.PAGBANK_WEBHOOK_TOKEN) {
    const headerToken = request.headers.get("x-authenticity-token") || "";
    const expected = await sha256(`${env.PAGBANK_WEBHOOK_TOKEN}-${raw}`);
    if (!headerToken || headerToken.toLowerCase() !== expected.toLowerCase()) return unauthorized("Invalid webhook signature");
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return badRequest("Payload invalido");
  }

  const referenceId = payload.reference_id || "";
  const orderId = payload.id || request.headers.get("x-product-id") || "";
  const row = await env.DB.prepare(
    "SELECT * FROM payment_exports WHERE reference_id = ? OR pagbank_order_id = ?"
  ).bind(referenceId, orderId).first();
  if (!row) return json({ ok: true });

  await savePaymentFromOrder(env, row, payload);
  return json({ ok: true });
}

async function handlePayments(request, env, parts) {
  if (parts[2] === "pagbank-webhook" && request.method === "POST") return handlePagBankWebhook(request, env);
  if (parts[2] === "stripe-webhook" && request.method === "POST") return handleStripeWebhook(request, env);
  if (parts[2] === "efi-webhook" && request.method === "POST") return handleEfiWebhook(request, env);

  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  if (parts[2] === "export-png" && request.method === "POST") {
    if (ACTIVE_PAYMENT_PROVIDER === "efi") return createEfiBackendPngPayment(request, env, auth.user);
    return ACTIVE_PAYMENT_PROVIDER === "stripe" ? createStripePngPayment(request, env, auth.user) : createPngPayment(request, env, auth.user);
  }

  const id = parts[2];
  if (id && parts[3] === "status" && request.method === "GET") return getPaymentStatus(env, auth.user, id);
  if (id && parts[3] === "qr.png" && request.method === "GET") return getPaymentQr(env, auth.user, id);

  return notFound();
}

async function handleAuth(request, env, action) {
  if (action === "register" && request.method === "POST") return register(request, env);
  if (action === "verify" && request.method === "POST") return verifyEmail(request, env);
  if (action === "resend-verification" && request.method === "POST") return resendVerification(request, env);
  if (action === "login" && request.method === "POST") return login(request, env);
  if (action === "logout" && request.method === "POST") return logout(request, env);
  if (action === "forgot-password" && request.method === "POST") return forgotPassword(request, env);
  if (action === "reset-password" && request.method === "POST") return resetPassword(request, env);
  if (action === "me" && request.method === "GET") return me(request, env);
  return notFound();
}

async function serveStyledAsset(env, parts) {
  const folder = sanitizeAssetPart(parts[2] || "");
  const filename = String(parts[3] || "").replace(/[^a-z0-9_.-]/gi, "").slice(0, 90);
  if (!folder || !filename) return notFound();
  const row = await env.DB.prepare(
    "SELECT content_type, data_base64, updated_at FROM styled_furniture_assets WHERE folder = ? AND filename = ?"
  ).bind(folder, filename).first();
  if (!row) return notFound();
  return new Response(base64ToBytes(row.data_base64), {
    headers: {
      "content-type": row.content_type || "image/png",
      "cache-control": "public, max-age=60",
      "last-modified": new Date(row.updated_at || Date.now()).toUTCString(),
    },
  });
}

async function handleApi(request, env) {
  if (!env.DB) return json({ error: "D1 binding DB is not configured" }, { status: 500 });

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/api/health") return json({ ok: true });
  if (parts[0] !== "api") return notFound();
  if (parts[1] === "styled-assets" && request.method === "GET") return serveStyledAsset(env, parts);
  if (parts[1] === "auth") return handleAuth(request, env, parts[2]);
  if (parts[1] === "admin") return handleAdmin(request, env, parts);
  if (parts[1] === "payments") return handlePayments(request, env, parts);
  if (parts[1] !== "projects") return notFound();

  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const id = parts[2];
  if (!id && request.method === "GET") return listProjects(env, auth.user.id);
  if (!id && request.method === "POST") return saveProject(request, env, auth.user.id);
  if (id && request.method === "GET") return getProject(env, auth.user.id, id);
  if (id && request.method === "PUT") return saveProject(request, env, auth.user.id, id);
  if (id && request.method === "PATCH") return renameProject(request, env, auth.user.id, id);
  if (id && request.method === "DELETE") return deleteProject(env, auth.user.id, id);

  return json({ error: "Method not allowed" }, { status: 405 });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return handleApi(request, env);
      if (url.pathname === "/favicon.ico") return new Response(null, { status: 204, headers: { "cache-control": "public, max-age=86400" } });
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      return json({ error: "Erro interno no servidor" }, { status: 500 });
    }
  },
};
