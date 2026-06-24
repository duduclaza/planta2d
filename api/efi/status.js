"use strict";

const { getPixStatus, handleError, requireBackendAuth, send } = require("./_client");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  try {
    requireBackendAuth(req);
    const txid = String(req.query.txid || "").trim();
    if (!txid) return send(res, 400, { error: "txid obrigatorio" });
    const status = await getPixStatus(txid);
    send(res, 200, status);
  } catch (err) {
    handleError(res, err);
  }
};
