import { getConfig } from "../config.js";

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, init);
    if (res.ok || (res.status >= 400 && res.status < 500)) return res;
    if (i < retries) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  return fetch(url, init);
}

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${getConfig().PAPERCLIP_API_KEY}`, "Content-Type": "application/json" };
}

function base(): string {
  return `${getConfig().PAPERCLIP_API_URL}/api`;
}

export interface PaperclipIssue {
  id: string; title: string; status: string; source?: string;
  metadata?: Record<string, unknown>; externalId?: string; externalSource?: string;
  assignee?: { name: string }; totalCost?: number;
}

export interface PaperclipCostEvent {
  id: string; issueId: string; amount: number; tokensIn: number;
  tokensOut: number; model: string; agentName?: string; createdAt: string;
}

export async function getIssues(since?: Date): Promise<PaperclipIssue[]> {
  const params = since ? `?updatedSince=${since.toISOString()}` : "";
  const res = await fetchWithRetry(`${base()}/issues${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`getIssues failed: ${res.status}`);
  const data = await res.json();
  return data.results ?? data.issues ?? data;
}

export async function getIssue(id: string): Promise<PaperclipIssue> {
  const res = await fetchWithRetry(`${base()}/issues/${id}`, { headers: headers() });
  if (!res.ok) throw new Error(`getIssue failed: ${res.status}`);
  return res.json();
}

export async function createIssue(data: Record<string, unknown>): Promise<PaperclipIssue> {
  const res = await fetchWithRetry(`${base()}/issues`, {
    method: "POST", headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`createIssue failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function updateIssue(id: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetchWithRetry(`${base()}/issues/${id}`, {
    method: "PATCH", headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`updateIssue failed: ${res.status}`);
}

export async function getCostEvents(since?: Date): Promise<PaperclipCostEvent[]> {
  const params = since ? `?since=${since.toISOString()}` : "";
  const res = await fetchWithRetry(`${base()}/cost-events${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`getCostEvents failed: ${res.status}`);
  const data = await res.json();
  return data.results ?? data.events ?? data;
}
