import type { PlaneState } from "../clients/plane.js";

export const PLANE_TO_CLIP: Record<string, string> = {
  Backlog: "backlog", Todo: "todo", Scoped: "todo", Assigned: "todo",
  "In Progress": "in_progress", "Needs Approval": "in_review",
  Approved: "todo", Completed: "done", Done: "done",
  Blocked: "blocked", Cancelled: "cancelled", Archived: "cancelled",
};

export const CLIP_TO_PLANE: Record<string, string> = {
  backlog: "", todo: "", in_progress: "", in_review: "",
  done: "", blocked: "", cancelled: "",
};

const CLIP_TO_PLANE_NAME: Record<string, string> = {
  backlog: "Backlog", todo: "Todo", in_progress: "In Progress",
  in_review: "Needs Approval", done: "Completed", blocked: "Blocked", cancelled: "Cancelled",
};

export const CHECKOUT_MANAGED_STATES = ["in_progress"];

export function resolveStateUUIDs(states: PlaneState[]): void {
  for (const [clipStatus, planeName] of Object.entries(CLIP_TO_PLANE_NAME)) {
    const match = states.find((s) => s.name === planeName);
    if (match) CLIP_TO_PLANE[clipStatus] = match.id;
  }
  const missing = Object.entries(CLIP_TO_PLANE).filter(([, v]) => !v);
  if (missing.length) console.warn("Unresolved state mappings:", missing.map(([k]) => k));
}

export function mapPlaneToClip(planeStateName: string): string | undefined {
  return PLANE_TO_CLIP[planeStateName];
}

export function mapClipToPlane(clipStatus: string): string | undefined {
  return CLIP_TO_PLANE[clipStatus] || undefined;
}
