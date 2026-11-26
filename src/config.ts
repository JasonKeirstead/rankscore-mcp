import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface Config {
  /** Enables the articles tools (documented API). */
  apiKey?: string;
  /** With password: enables the dashboard tools (undocumented API). */
  email?: string;
  password?: string;
  projectId?: string;
  /** Registers the tools that change data or start jobs. Default off. */
  enableWrites: boolean;
  apiBase?: string;
  dashboardOrigin?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface FileIo {
  readFileSync(path: string, encoding: "utf8"): string;
  statSync(path: string): { mode: number };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HEADER_SAFE = /^[\x21-\x7e]+$/;

/** A value sent in an HTTP header must be printable ASCII. The error never contains the value. */
export function assertHeaderSafe(name: string, value: string): void {
  if (!HEADER_SAFE.test(value)) {
    throw new ConfigError(
      `${name} has characters that cannot be sent in an HTTP header (spaces, line breaks or non-ASCII). Check the value and the line breaks of the credentials file.`,
    );
  }
}

/** Requires https (or http to localhost) and a parsable URL. The error never contains the URL. */
export function assertSecureUrl(name: string, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`${name} is not a valid URL.`);
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new ConfigError(`${name} must use https, because credentials are sent to it (http is allowed for localhost only).`);
  }
  return url;
}

/**
 * A plugin passes its settings as `${user_config.x}`. If a setting was left empty the
 * placeholder may arrive as it is; it means "not set", never a value.
 */
const PLACEHOLDER = /^\$\{[^}]*\}$/;

const clean = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t && !PLACEHOLDER.test(t) ? t : undefined;
};

/** A password keeps its inner and outer spaces, but a blank line or a placeholder is no password. */
const password = (v: string | undefined): string | undefined => (v && v.trim() !== "" && !PLACEHOLDER.test(v.trim()) ? v : undefined);

const NO_CREDENTIALS =
  "No RankScore credentials. Set RANKSCORE_API_KEY (articles tools), RANKSCORE_EMAIL and RANKSCORE_PASSWORD (dashboard tools), " +
  "or set RANKSCORE_CREDENTIALS_FILE to a file with the API key, email and password on lines 1, 2 and 3.";

/**
 * Reads settings from the environment. Values in RANKSCORE_CREDENTIALS_FILE
 * (line 1 API key, line 2 email, line 3 password) fill in what the environment leaves unset.
 * Error and warning text never contains a secret.
 */
export function loadConfig(
  env: NodeJS.ProcessEnv,
  io: FileIo = { readFileSync, statSync },
  platform: NodeJS.Platform = process.platform,
): { config: Config; warnings: string[] } {
  const warnings: string[] = [];
  let fileKey: string | undefined;
  let fileEmail: string | undefined;
  let filePassword: string | undefined;

  const rawPath = clean(env.RANKSCORE_CREDENTIALS_FILE);
  if (rawPath) {
    const path = rawPath === "~" || rawPath.startsWith("~/") ? homedir() + rawPath.slice(1) : rawPath;
    let text: string;
    try {
      text = io.readFileSync(path, "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "unknown error";
      throw new ConfigError(`Cannot read RANKSCORE_CREDENTIALS_FILE (${code}): ${path}`);
    }
    // A byte order mark or lone CR line breaks must not end up inside a value.
    const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
    fileKey = clean(lines[0]);
    fileEmail = clean(lines[1]);
    filePassword = password(lines[2]);
    if (filePassword && platform !== "win32") {
      try {
        if (io.statSync(path).mode & 0o077) warnings.push(`${path} holds a password and other users can read it. Run: chmod 600 ${path}`);
      } catch {
        // Permission check is best effort.
      }
    }
  }

  const writes = clean(env.RANKSCORE_ENABLE_WRITES)?.toLowerCase();
  const config: Config = {
    apiKey: clean(env.RANKSCORE_API_KEY) ?? fileKey,
    email: clean(env.RANKSCORE_EMAIL) ?? fileEmail,
    password: password(env.RANKSCORE_PASSWORD) ?? filePassword,
    projectId: clean(env.RANKSCORE_PROJECT_ID),
    enableWrites: writes === "1" || writes === "true" || writes === "yes",
    apiBase: clean(env.RANKSCORE_API_BASE),
    dashboardOrigin: clean(env.RANKSCORE_DASHBOARD_ORIGIN),
    supabaseUrl: clean(env.RANKSCORE_SUPABASE_URL),
    supabaseAnonKey: clean(env.RANKSCORE_SUPABASE_ANON_KEY),
  };

  if (Boolean(config.email) !== Boolean(config.password)) {
    throw new ConfigError("Set both the RankScore email and the password, or neither.");
  }
  if (!config.apiKey && !config.email) throw new ConfigError(NO_CREDENTIALS);
  if (config.apiKey) assertHeaderSafe("The RankScore API key", config.apiKey);
  if (config.supabaseAnonKey) assertHeaderSafe("RANKSCORE_SUPABASE_ANON_KEY", config.supabaseAnonKey);
  if (config.projectId && !UUID_RE.test(config.projectId)) {
    throw new ConfigError("RANKSCORE_PROJECT_ID must be a project UUID.");
  }
  if (config.enableWrites && !config.email) {
    warnings.push("RANKSCORE_ENABLE_WRITES is set, but the write tools need the email and password. No write tools are enabled.");
  }
  return { config, warnings };
}
