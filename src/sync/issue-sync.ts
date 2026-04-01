import crypto from "node:crypto";
import { getConfig } from "../config.js";
import * as plane from "../clients/plane.js";
import * as paperclip from "../clients/paperclip.js";
import { PLANE_TO_CLIP, CHECKOUT_MANAGED_STATES, mapClipToPlane } from "./state-map.js";
import * as lookup from "./lookup.js";

const processedDeliveries = new Set<string>();

function hasLabel(data: Record<string, unknown>, labelName: string): boolean {
  const labels = data.labels as { name: string }[] | undefined;
  return labels?.some((l) => l.name === labelName) ?? false;
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

export async function handlePlaneWebhook(payload: Record<string, unknown>): Promise<void> {
  const { event, action, data } = payload as {
    event: string; action: string; data: Record<string, unknown>;
  };
  const deliveryId = payload["X-Plane-Delivery"] as string | undefined;
  if (deliveryId && processedDeliveries.has(deliveryId)) return;
  if (deliveryId) processedDeliveries.add(deliveryId);

  if (event !== "issue") return;
  if (!hasLabel(data, "agent")) return;

  const planeId = data.id as string;
  const projectId = (data.project as string) ?? "";

  if (action === "created") {
    const existing = lookup.lookupByPlane(planeId);
    if (existing) return;

    const issue = await paperclip.createIssue({
      title: data.name, description: data.description_html,
      priority: data.priority, status: PLANE_TO_CLIP[data.state as string] ?? "todo",
      externalId: planeId, externalSource: "plane",
      metadata: { originalPlaneState: data.state },
    });

    lookup.upsert({ planeId, planeProjectId: projectId, paperclipId: issue.id, source: "plane", originalPlaneState: data.state as string });
  }

  if (action === "update") {
    const record = lookup.lookupByPlane(planeId);
    if (!record) return;

    const clipStatus = PLANE_TO_CLIP[data.state as string];
    if (clipStatus && !CHECKOUT_MANAGED_STATES.includes(clipStatus)) {
      await paperclip.updateIssue(record.paperclipId, {
        status: clipStatus,
        metadata: { originalPlaneState: data.state },
      });
    }
  }
}

export async function pollPaperclipUpdates(): Promise<void> {
  const since = lookup.getStats().lastPollTime ? new Date(lookup.getStats().lastPollTime) : undefined;
  const issues = await paperclip.getIssues(since);
  const config = getConfig();

  for (const issue of issues) {
    if (issue.source === "discord" && issue.externalSource !== "plane" && !lookup.lookupByPaperclip(issue.id)) {
      try {
        const planeItem = await plane.createWorkItem("default-project-id", {
          name: issue.title, description_html: (issue.metadata?.description as string) ?? issue.title,
          labels: ["agent", "discord-origin"],
        });
        lookup.upsert({ planeId: planeItem.id, planeProjectId: "default-project-id", paperclipId: issue.id, source: "discord" });
      } catch (err) {
        console.error("Failed to reverse-sync Discord task to Plane:", err);
      }
      continue;
    }

    const record = lookup.lookupByPaperclip(issue.id);
    if (!record) continue;

    const planeStateId = mapClipToPlane(issue.status);
    if (!planeStateId) continue;

    let finalState = planeStateId;
    if (issue.status === "done" && (issue.totalCost ?? 0) >= config.APPROVAL_THRESHOLD) {
      const reviewState = mapClipToPlane("in_review");
      if (reviewState) finalState = reviewState;
    }

    try {
      await plane.updateWorkItem(record.planeProjectId, record.planeId, { state: finalState });
    } catch (err) {
      console.error(`Failed to sync issue ${issue.id} to Plane:`, err);
    }
  }

  lookup.setLastPollTime(Date.now());
}
