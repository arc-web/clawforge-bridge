import express from "express";
import { loadConfig, getConfig } from "./config.js";
import { getStates } from "./clients/plane.js";
import { resolveStateUUIDs } from "./sync/state-map.js";
import { handlePlaneWebhook, verifySignature, pollPaperclipUpdates } from "./sync/issue-sync.js";
import { syncCostEvents } from "./sync/cost-sync.js";
import { exchangeAuth } from "./auth/exchange.js";
import * as lookup from "./sync/lookup.js";

const config = loadConfig();
const app = express();

app.post("/webhooks/plane", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-plane-signature"] as string;
  if (!signature || !verifySignature(req.body.toString(), signature, config.PLANE_WEBHOOK_SECRET)) {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }
  try {
    const payload = JSON.parse(req.body.toString());
    payload["X-Plane-Delivery"] = req.headers["x-plane-delivery"];
    await handlePlaneWebhook(payload);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.use(express.json());

app.post("/api/agents/auth/exchange", async (req, res) => {
  try {
    const { planeSessionCookie } = req.body;
    const result = await exchangeAuth(planeSessionCookie);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

app.get("/api/lookup", (req, res) => {
  const paperclipId = req.query.paperclipId as string;
  if (!paperclipId) { res.status(400).json({ error: "paperclipId required" }); return; }
  const record = lookup.lookupByPaperclip(paperclipId);
  if (!record) { res.json({ paperclipId, planeUrl: null }); return; }
  const planeUrl = `https://arc.todovibes.com/${config.PLANE_WORKSPACE_SLUG}/projects/${record.planeProjectId}/work-items/${record.planeId}`;
  res.json({ paperclipId, planeId: record.planeId, planeUrl });
});

app.get("/health", (_req, res) => {
  const stats = lookup.getStats();
  res.json({
    status: "ok", uptime: process.uptime(),
    syncRecords: stats.count, totalSyncs: stats.totalSyncs,
    lastPollTime: stats.lastPollTime ? new Date(stats.lastPollTime).toISOString() : null,
    lastCostSyncTime: stats.lastCostSyncTime ? new Date(stats.lastCostSyncTime).toISOString() : null,
    approvalThreshold: config.APPROVAL_THRESHOLD,
  });
});

async function start() {
  try {
    const states = await getStates();
    resolveStateUUIDs(states);
    console.log(`Resolved ${states.length} Plane states`);
  } catch (err) {
    console.warn("Could not resolve Plane states (will retry on first sync):", (err as Error).message);
  }

  setInterval(async () => {
    try { await pollPaperclipUpdates(); } catch (err) { console.error("Poll error:", err); }
  }, config.POLL_INTERVAL_MS);

  setInterval(async () => {
    try { await syncCostEvents(); } catch (err) { console.error("Cost sync error:", err); }
  }, config.COST_SYNC_INTERVAL_MS);

  app.listen(config.PORT, () => console.log(`Bridge listening on :${config.PORT}`));
}

start().catch((err) => { console.error("Bridge startup failed:", err); process.exit(1); });

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => { console.log(`Received ${sig}, shutting down`); process.exit(0); });
}
