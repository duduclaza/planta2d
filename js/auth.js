"use strict";

const AUTH_TOKEN_KEY = "planta2d:authToken";
const AUTH_USER_KEY = "planta2d:authUser";
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
let authUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");

function authHeaders() {
  return authToken ? { authorization: "Bearer " + authToken } : {};
}

async function authJson(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
      ...((options && options.headers) || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Erro na requisicao");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function setAuthSession(token, user) {
  authToken = token || "";
  authUser = user || null;
  if (authToken) localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
  if (authUser) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
  else localStorage.removeItem(AUTH_USER_KEY);
  updateAuthUi();
  if (authUser && typeof setTool === "function") setTool("select");
  if (authUser && typeof showProjectChoice === "function") showProjectChoice();
}

function clearAuthSession() {
  setAuthSession("", null);
  localStorage.removeItem("planta2d:projectId");
  try {
    if (typeof cloudProjectId !== "undefined") cloudProjectId = null;
  } catch {}
  try {
    if (typeof resetEditorProject === "function") resetEditorProject();
  } catch {}
}

function updateAuthUi() {
  const overlay = document.getElementById("authScreen");
  const account = document.getElementById("accountEmail");
  const logout = document.getElementById("btnLogout");
  const admin = document.getElementById("btnAdminManagement");
  if (account) account.textContent = authUser ? authUser.email : "";
  if (logout) logout.style.display = authUser ? "inline-flex" : "none";
  if (admin) admin.style.display = authUser && authUser.is_super_admin ? "inline-flex" : "none";
  if (overlay) overlay.classList.toggle("show", !authUser);
}

function setAuthMessage(message, isError) {
  const box = document.getElementById("authMsg");
  if (!box) return;
  box.textContent = message || "";
  box.classList.toggle("error", !!isError);
  box.classList.toggle("show", !!message);
}

function setAuthMode(mode) {
  document.querySelectorAll(".authForm").forEach((form) => form.classList.toggle("active", form.dataset.mode === mode));
  document.querySelectorAll(".authTab").forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  setAuthMessage("");
}

function showAuth(mode = "login") {
  clearAuthSession();
  setAuthMode(mode);
  updateAuthUi();
}

async function bootAuth() {
  if (!authToken) {
    updateAuthUi();
    return;
  }

  try {
    const data = await authJson("/api/auth/me");
    setAuthSession(authToken, data.user);
  } catch {
    clearAuthSession();
  }
}

function bindAuthForms() {
  document.querySelectorAll(".passEye").forEach((button) => {
    button.onclick = () => {
      const input = button.parentElement && button.parentElement.querySelector("input");
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.classList.toggle("is-visible", !visible);
      button.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    };
  });

  document.querySelectorAll(".authTab").forEach((tab) => {
    tab.onclick = () => setAuthMode(tab.dataset.mode);
  });

  const login = document.getElementById("loginForm");
  const register = document.getElementById("registerForm");
  const verify = document.getElementById("verifyForm");
  const forgot = document.getElementById("forgotForm");
  const reset = document.getElementById("resetForm");
  const logout = document.getElementById("btnLogout");

  if (login) login.onsubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await authJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: login.email.value,
          password: login.password.value,
        }),
      });
      setAuthSession(data.token, data.user);
      setAuthMessage("");
    } catch (err) {
      if (err.data && err.data.needs_verification) {
        document.getElementById("verifyEmail").value = login.email.value;
        setAuthMode("verify");
        setAuthMessage("Digite o codigo que enviamos para confirmar seu cadastro.");
      } else {
        setAuthMessage(err.message, true);
      }
    }
  };

  if (register) register.onsubmit = async (event) => {
    event.preventDefault();
    try {
      await authJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: register.name.value,
          email: register.email.value,
          password: register.password.value,
        }),
      });
      document.getElementById("verifyEmail").value = register.email.value;
      setAuthMode("verify");
      setAuthMessage("Cadastro criado. Confira seu email e digite o codigo recebido.");
    } catch (err) {
      setAuthMessage(err.message, true);
    }
  };

  if (verify) verify.onsubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await authJson("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          email: verify.email.value,
          code: verify.code.value,
        }),
      });
      setAuthSession(data.token, data.user);
    } catch (err) {
      setAuthMessage(err.message, true);
    }
  };

  const resend = document.getElementById("btnResendCode");
  if (resend) resend.onclick = async () => {
    const email = document.getElementById("verifyEmail").value;
    if (!email) {
      setAuthMessage("Informe o email para reenviar o codigo.", true);
      return;
    }
    await authJson("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
    setAuthMessage("Codigo reenviado. Confira seu email.");
  };

  if (forgot) forgot.onsubmit = async (event) => {
    event.preventDefault();
    try {
      await authJson("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgot.email.value }),
      });
      document.getElementById("resetEmail").value = forgot.email.value;
      setAuthMode("reset");
      setAuthMessage("Se o email existir, enviamos um codigo de recuperacao.");
    } catch (err) {
      setAuthMessage(err.message, true);
    }
  };

  if (reset) reset.onsubmit = async (event) => {
    event.preventDefault();
    try {
      await authJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: reset.email.value,
          code: reset.code.value,
          password: reset.password.value,
        }),
      });
      setAuthMode("login");
      setAuthMessage("Senha alterada. Entre com a nova senha.");
    } catch (err) {
      setAuthMessage(err.message, true);
    }
  };

  if (logout) logout.onclick = async () => {
    try {
      await authJson("/api/auth/logout", { method: "POST" });
    } catch {}
    clearAuthSession();
    showAuth("login");
  };
}

document.addEventListener("DOMContentLoaded", () => {
  bindAuthForms();
  setAuthMode("login");
  bootAuth();
});
