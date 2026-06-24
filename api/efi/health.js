"use strict";

const { accessToken, handleError, requireBackendAuth, send } = require("./_client");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  try {
    requireBackendAuth(req);
    const token = await accessToken();
    send(res, 200, { ok: true, message: "Backend Efi autenticou com sucesso", token_preview: token ? `${token.slice(0, 8)}...` : "" });
  } catch (err) {
    handleError(res, err);
  }
};
