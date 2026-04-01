import * as paperclip from "../clients/paperclip.js";
import * as plane from "../clients/plane.js";
import * as lookup from "./lookup.js";

export async function syncCostEvents(): Promise<void> {
  const since = lookup.getStats().lastCostSyncTime ? new Date(lookup.getStats().lastCostSyncTime) : undefined;
  const events = await paperclip.getCostEvents(since);

  const grouped = new Map<string, typeof events>();
  for (const ev of events) {
    const arr = grouped.get(ev.issueId) ?? [];
    arr.push(ev);
    grouped.set(ev.issueId, arr);
  }

  for (const [issueId, costs] of grouped) {
    const record = lookup.lookupByPaperclip(issueId);
    if (!record) continue;

    const total = costs.reduce((s, c) => s + c.amount, 0);
    const tokensIn = costs.reduce((s, c) => s + c.tokensIn, 0);
    const tokensOut = costs.reduce((s, c) => s + c.tokensOut, 0);

    const html = `<h3>Agent Cost Report</h3>\n<table>\n<tr><td><b>Agent</b></td><td>${costs[0]?.agentName ?? "Unknown"}</td></tr>\n<tr><td><b>Model</b></td><td>${costs[0]?.model ?? "N/A"}</td></tr>\n<tr><td><b>Tokens (in/out)</b></td><td>${tokensIn.toLocaleString()} / ${tokensOut.toLocaleString()}</td></tr>\n<tr><td><b>Total Cost</b></td><td>$${total.toFixed(4)}</td></tr>\n<tr><td><b>Runs</b></td><td>${costs.length}</td></tr>\n</table>`;

    try {
      await plane.addComment(record.planeProjectId, record.planeId, html);
    } catch (err) {
      console.error(`Failed to post cost comment for ${issueId}:`, err);
    }
  }

  lookup.setLastCostSyncTime(Date.now());
}
