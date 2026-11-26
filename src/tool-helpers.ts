import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { UUID_RE } from "./config.js";
import { RankScoreError } from "./http.js";

export const ok = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

export const fail = (err: unknown): CallToolResult => ({
  isError: true,
  content: [
    {
      type: "text",
      text: err instanceof RankScoreError ? err.message : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    },
  ],
});

export const projectIdSchema = z
  .string()
  .regex(UUID_RE, "project_id must be a UUID")
  .optional()
  .describe("RankScore project UUID. Defaults to RANKSCORE_PROJECT_ID.");

/** An id that is put in a URL path: letters, digits, "-" and "_" only, so it cannot add path segments. */
export const idSchema = (describe: string) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,100}$/, "Use only letters, digits, - and _")
    .describe(describe);

export function projectResolver(defaultProjectId?: string): (id: string | undefined) => string {
  return (id) => {
    const project = id ?? defaultProjectId;
    if (!project) throw new RankScoreError("project_id is required. Pass it, or set RANKSCORE_PROJECT_ID.");
    return project;
  };
}
