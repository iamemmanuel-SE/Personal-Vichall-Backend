// src/auth/resetApi.js (CRA-compatible)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001";

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function startPasswordReset(email) {
  return post("/api/auth/forgot-password", { email });
}

export function resendResetCode(email) {
  return post("/api/auth/resend-reset-code", { email });
}

export function verifyResetCode(email, code) {
  return post("/api/auth/verify-reset-code", { email, code });
}

export function resetPassword(email, resetToken, newPassword) {
  return post("/api/auth/reset-password", { email, resetToken, newPassword });
}
