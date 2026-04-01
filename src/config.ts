import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3200),
  PLANE_API_URL: z.string().url(),
  PLANE_API_KEY: z.string().min(1),
  PLANE_WORKSPACE_SLUG: z.string().min(1),
  PLANE_WEBHOOK_SECRET: z.string().min(1),
  PAPERCLIP_API_URL: z.string().url(),
  PAPERCLIP_API_KEY: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().default(30_000),
  COST_SYNC_INTERVAL_MS: z.coerce.number().default(300_000),
  APPROVAL_THRESHOLD: z.coerce.number().default(5.0),
});

export type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function loadConfig(): Config {
  config = envSchema.parse(process.env);
  return config;
}

export function getConfig(): Config {
  if (!config) throw new Error("Config not loaded. Call loadConfig() first.");
  return config;
}
