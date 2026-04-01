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
  return { "X-API-Key": getConfig().PLANE_API_KEY, "Content-Type": "application/json" };
}

function base(): string {
  const c = getConfig();
  return `${c.PLANE_API_URL}/workspaces/${c.PLANE_WORKSPACE_SLUG}`;
}

export interface PlaneState { id: string; name: string; group: string; }
export interface PlaneWorkItem { id: string; name: string; state: string; priority: string; labels: { id: string; name: string }[]; description_html?: string; }

export async function getStates(): Promise<PlaneState[]> {
  const res = await fetchWithRetry(`${base()}/states/`, { headers: headers() });
  if (!res.ok) throw new Error(`getStates failed: ${res.status}`);
  const data = await res.json();
  return data.results ?? data;
}

export async function getWorkItem(projectId: string, workItemId: string): Promise<PlaneWorkItem> {
  const res = await fetchWithRetry(`${base()}/projects/${projectId}/work-items/${workItemId}/`, { headers: headers() });
  if (!res.ok) throw new Error(`getWorkItem failed: ${res.status}`);
  return res.json();
}

export async function createWorkItem(projectId: string, data: Record<string, unknown>): Promise<PlaneWorkItem> {
  const res = await fetchWithRetry(`${base()}/projects/${projectId}/work-items/`, {
    method: "POST", headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`createWorkItem failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function updateWorkItem(projectId: string, workItemId: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetchWithRetry(`${base()}/projects/${projectId}/work-items/${workItemId}/`, {
    method: "PATCH", headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`updateWorkItem failed: ${res.status}`);
}

export async function addComment(projectId: string, workItemId: string, commentHtml: string): Promise<void> {
  const res = await fetchWithRetry(`${base()}/projects/${projectId}/work-items/${workItemId}/comments/`, {
    method: "POST", headers: headers(), body: JSON.stringify({ comment_html: commentHtml }),
  });
  if (!res.ok) throw new Error(`addComment failed: ${res.status}`);
}
