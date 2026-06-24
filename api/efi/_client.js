"use strict";

const https = require("https");

const PRICE_CENTS = 199;

function env(name) {
  return String(process.env[name] || "").trim();
}

function required(name) {
  const value = env(name);
  if (!value) throw new Error(`${name} nao esta configurado na Vercel`);
  return value;
}

function decodePem(name) {
  const b64 = env(`${name}_B64`);
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  return required(name).replace(/\\n/g, "\n");
}

function baseUrl() {
  return env("EFI_ENV").toLowerCase() === "sandbox"
    ? "https://pix-h.api.efipay.com.br"
    : "https://pix.api.efipay.com.br";
}

function agent() {
  return new https.Agent({
    cert: decodePem("EFI_CERT_PEM"),
    key: decodePem("EFI_KEY_PEM"),
  });
}

function request(path, { method = "GET", headers = {}, body } = {}) {
  const url = new URL(path, baseUrl());
  const payload = body == null ? null : JSON.stringify(body);
  const options = {
    method,
    agent: agent(),
    headers: {
      accept: "application/json",
      ...headers,
    },
  };
  if (payload) {
    options.headers["content-type"] = "application/json";
    options.headers["content-length"] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { raw };
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message =
            data.mensagem ||
            data.message ||
            data.erro ||
            data.error_description ||
            data.raw ||
            "Efi recusou a requisicao";
          reject(new Error(`Efi HTTP ${res.statusCode} em ${path}: ${message}`));
          return;
        }
        resolve(data);
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function accessToken() {
  const basic = Buffer.from(`${required("EFI_CLIENT_ID")}:${required("EFI_CLIENT_SECRET")}`).toString("base64");
  const data = await request("/oauth/token", {
    method: "POST",
    headers: { authorization: `Basic ${basic}` },
    body: { grant_type: "client_credentials" },
  });
  return data.access_token;
}

function txid() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 26; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isPaid(charge) {
  return String(charge && charge.status || "").toUpperCase() === "CONCLUIDA";
}

async function createPix({ projectName }) {
  const token = await accessToken();
  const id = txid();
  const charge = await request(`/v2/cob/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}` },
    body: {
      calendario: { expiracao: 3600 },
      valor: { original: (PRICE_CENTS / 100).toFixed(2) },
      chave: required("EFI_PIX_KEY"),
      solicitacaoPagador: `Exportacao PNG - ${String(projectName || "Planta baixa").slice(0, 80)}`.slice(0, 140),
    },
  });
  const locId = charge.loc && charge.loc.id;
  if (!locId) throw new Error("Efi criou a cobranca, mas nao retornou loc.id");
  const qr = await request(`/v2/loc/${encodeURIComponent(locId)}/qrcode`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return {
    txid: id,
    loc_id: String(locId),
    amount_cents: PRICE_CENTS,
    status: isPaid(charge) ? "PAID" : "WAITING",
    paid: isPaid(charge),
    qr_text: qr.qrcode || null,
    qr_image_url: qr.imagemQrcode || null,
    payload: { charge, qr },
  };
}

async function getPixStatus(id) {
  const token = await accessToken();
  const charge = await request(`/v2/cob/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return {
    txid: id,
    status: isPaid(charge) ? "PAID" : String(charge.status || "WAITING").toUpperCase(),
    paid: isPaid(charge),
    payload: charge,
  };
}

function requireBackendAuth(req) {
  const expected = required("EFI_BACKEND_TOKEN");
  const got = String(req.headers["x-efi-backend-token"] || "");
  if (got !== expected) {
    const err = new Error("Token do backend Efi invalido");
    err.statusCode = 401;
    throw err;
  }
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function handleError(res, err) {
  send(res, err.statusCode || 502, { error: err.message || "Erro interno Efi" });
}

module.exports = {
  accessToken,
  createPix,
  getPixStatus,
  handleError,
  readJson,
  requireBackendAuth,
  send,
};
