import { getToken } from "./authStore";

export async function fetchMe() {
  const token = getToken();
  if (!token) throw new Error("Missing token");

  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to fetch user");

  return data.user;
}
