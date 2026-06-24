"use strict";

const { createPix, handleError, readJson, requireBackendAuth, send } = require("./_client");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    requireBackendAuth(req);
    const body = await readJson(req);
    const payment = await createPix({ projectName: body.project_name });
    send(res, 200, payment);
  } catch (err) {
    handleError(res, err);
  }
};
