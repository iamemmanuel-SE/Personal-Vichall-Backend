// src/auth/fakeResetApi.js
// A tiny client-only "backend" for password reset simulation.
// NOTE: This is NOT secure and is only for demo/dev.

const STORAGE_KEY = "vh_reset_flow_v1";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function now() {
  return Date.now();
}

function gen4DigitCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function genToken() {
  // simple token for demo
  return `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

/**
 * Start reset: store email + code + expiry.
 * In real life you'd email this code. Here we log it.
 */
export function startPasswordReset(email) {
  const data = load();
  const code = gen4DigitCode();

  data.reset = {
    email,
    code,
    codeExpiresAt: now() + 5 * 60 * 1000, // 5 min
    attemptsLeft: 5,
    verified: false,
    resetToken: null,
    resetExpiresAt: null,
  };

  save(data);

  // Simulate "sending email"
  console.log(`[SIMULATION] Reset code for ${email}: ${code}`);

  return { ok: true };
}

export function resendCode(email) {
  // For demo: generate a brand new code each resend
  return startPasswordReset(email);
}

export function verifyResetCode(email, codeInput) {
  const data = load();
  const r = data.reset;

  if (!r || r.email !== email) return { ok: false, error: "No reset request found for this email." };
  if (now() > r.codeExpiresAt) return { ok: false, error: "Code expired. Please resend a new one." };
  if (r.attemptsLeft <= 0) return { ok: false, error: "Too many attempts. Please resend a new code." };

  if (r.code !== codeInput) {
    r.attemptsLeft -= 1;
    save(data);
    return { ok: false, error: `Incorrect code. Attempts left: ${r.attemptsLeft}` };
  }

  // Code correct: mark verified and mint a short-lived reset token
  r.verified = true;
  r.resetToken = genToken();
  r.resetExpiresAt = now() + 10 * 60 * 1000; // 10 min to reset password
  save(data);

  return { ok: true, resetToken: r.resetToken };
}

export function canResetPassword(email, resetToken) {
  const data = load();
  const r = data.reset;
  if (!r || r.email !== email) return { ok: false, error: "Missing reset session." };
  if (!r.verified) return { ok: false, error: "Code not verified." };
  if (r.resetToken !== resetToken) return { ok: false, error: "Invalid reset token." };
  if (now() > r.resetExpiresAt) return { ok: false, error: "Reset session expired. Start again." };
  return { ok: true };
}

export function resetPassword(email, resetToken, newPassword) {
  const gate = canResetPassword(email, resetToken);
  if (!gate.ok) return gate;

  // Simulate "saving new password"
  const data = load();
  data.users = data.users || {};
  data.users[email] = { ...(data.users[email] || {}), password: newPassword };

  // Clear reset state after success
  delete data.reset;

  save(data);
  console.log(`[SIMULATION] Password updated for ${email}`);
  return { ok: true };
}
