import { getConfig } from "../config.js";

interface ExchangeResult { jwt: string; userId: string; email: string; }

export async function exchangeAuth(planeSessionCookie: string): Promise<ExchangeResult> {
  const config = getConfig();

  const planeRes = await fetch(`${config.PLANE_API_URL}/users/me/`, {
    headers: { Cookie: planeSessionCookie },
  });
  if (!planeRes.ok) throw new Error("Invalid Plane session");
  const planeUser = (await planeRes.json()) as { id: string; email: string; display_name: string };

  const clipRes = await fetch(`${config.PAPERCLIP_API_URL}/api/auth/admin/exchange`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.PAPERCLIP_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: planeUser.email, name: planeUser.display_name }),
  });

  if (!clipRes.ok) {
    return { jwt: config.PAPERCLIP_API_KEY, userId: planeUser.id, email: planeUser.email };
  }

  const { token } = (await clipRes.json()) as { token: string };
  return { jwt: token, userId: planeUser.id, email: planeUser.email };
}
