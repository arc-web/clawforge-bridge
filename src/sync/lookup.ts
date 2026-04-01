export interface SyncRecord {
  planeId: string;
  planeProjectId: string;
  paperclipId: string;
  originalPlaneState?: string;
  source?: string;
}

const byPlaneId = new Map<string, SyncRecord>();
const byPaperclipId = new Map<string, SyncRecord>();
let totalSyncs = 0;
let lastPollTime = 0;
let lastCostSyncTime = 0;

export function upsert(record: SyncRecord): void {
  byPlaneId.set(record.planeId, record);
  byPaperclipId.set(record.paperclipId, record);
  totalSyncs++;
}

export function lookupByPlane(planeId: string): SyncRecord | undefined {
  return byPlaneId.get(planeId);
}

export function lookupByPaperclip(paperclipId: string): SyncRecord | undefined {
  return byPaperclipId.get(paperclipId);
}

export function getStats() {
  return { count: byPlaneId.size, totalSyncs, lastPollTime, lastCostSyncTime };
}

export function setLastPollTime(t: number) { lastPollTime = t; }
export function setLastCostSyncTime(t: number) { lastCostSyncTime = t; }
