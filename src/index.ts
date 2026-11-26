#!/usr/bin/env node
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RankScoreClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";
import { DashboardClient } from "./dashboard.js";
import { createServer } from "./server.js";

let server: McpServer;
try {
  const { config, warnings } = loadConfig(process.env);
  for (const w of warnings) console.error(`warning: ${w}`);
  server = createServer({
    articles: config.apiKey ? new RankScoreClient({ apiKey: config.apiKey, baseUrl: config.apiBase }) : undefined,
    dashboard:
      config.email && config.password
        ? new DashboardClient({
            email: config.email,
            password: config.password,
            origin: config.dashboardOrigin,
            supabaseUrl: config.supabaseUrl,
            supabaseAnonKey: config.supabaseAnonKey,
          })
        : undefined,
    defaultProjectId: config.projectId,
    enableWrites: config.enableWrites,
  });
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(err.message);
  process.exit(1);
}

// stdout carries the MCP protocol: log to stderr only.
await server.connect(new StdioServerTransport());
console.error(`rankscore-mcp ready (stdio)`);
